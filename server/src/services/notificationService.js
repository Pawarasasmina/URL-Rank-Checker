const Brand = require('../models/Brand');
const SerpRun = require('../models/SerpRun');
const { normalizeChatIds, getTelegramTokenFromSettings, parseWibTime, sendTelegramText } = require('./backupService');

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (n) => String(n).padStart(2, '0');

const getWibDateParts = (date = new Date()) => {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return {
    year: wib.getUTCFullYear(),
    month: wib.getUTCMonth() + 1,
    day: wib.getUTCDate(),
    hour: wib.getUTCHours(),
    minute: wib.getUTCMinutes(),
  };
};

const getWibClock = (date = new Date()) => {
  const { hour, minute } = getWibDateParts(date);
  return `${pad2(hour)}:${pad2(minute)} WIB`;
};

const getWibDateKey = (date = new Date()) => {
  const { year, month, day } = getWibDateParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const getWibHourSlotKey = (date = new Date()) => {
  const { year, month, day, hour } = getWibDateParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}-${pad2(hour)}`;
};

const getWibDayRangeUtc = (date = new Date()) => {
  const wibMs = date.getTime() + WIB_OFFSET_MS;
  const dayStartWibMs = Math.floor(wibMs / DAY_MS) * DAY_MS;
  return {
    start: new Date(dayStartWibMs - WIB_OFFSET_MS),
    end: new Date(dayStartWibMs + DAY_MS - WIB_OFFSET_MS),
  };
};

const clamp = (value, min, max, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
};

const summarizeChanges = ({ comparisons, latestByBrandCode }) => {
  const improved = [];
  const dropped = [];
  const notFound = [];
  let noChangeCount = 0;

  comparisons.forEach((item) => {
    const previousRank = item.previousRank;
    const currentRank = item.currentRank;

    if (currentRank === null) {
      notFound.push(item.brandCode);
    }

    if (previousRank === currentRank) {
      noChangeCount += 1;
      return;
    }

    if (previousRank !== null && currentRank !== null) {
      if (currentRank < previousRank) {
        improved.push(`${item.brandCode} ▲${previousRank - currentRank}`);
        return;
      }
      if (currentRank > previousRank) {
        dropped.push(`${item.brandCode} ▼${currentRank - previousRank}`);
        return;
      }
    }
  });

  const latestRows = Array.from(latestByBrandCode.values());
  const sortedByOwn = [...latestRows].sort((a, b) => (b.ownCount || 0) - (a.ownCount || 0));
  const leading = sortedByOwn[0] || null;
  const worst = [...latestRows].sort((a, b) => (a.ownCount || 0) - (b.ownCount || 0))[0] || null;

  return {
    noChangeCount,
    improved,
    dropped,
    notFound,
    leading,
    worst,
  };
};

const shortList = (items, fallback = '-') => (items.length ? items.slice(0, 8).join(', ') : fallback);

const formatRank = (rank) => (rank === null ? 'NF' : `#${rank}`);

const buildBrandDetailLines = (comparisons) => {
  const sorted = [...comparisons].sort((a, b) => String(a.brandCode || '').localeCompare(String(b.brandCode || '')));
  return sorted.map((item) => {
    const previousRank = item.previousRank;
    const currentRank = item.currentRank;
    const brandCode = item.brandCode || '-';

    if (previousRank === null && currentRank === null) {
      return `- ${brandCode}: NF`;
    }
    if (previousRank === null && currentRank !== null) {
      return `- ${brandCode}: NEW ${formatRank(currentRank)}`;
    }
    if (previousRank !== null && currentRank === null) {
      return `- ${brandCode}: ${formatRank(previousRank)} -> NF (out)`;
    }
    if (previousRank === currentRank) {
      return `- ${brandCode}: ${formatRank(currentRank)} (=)`;
    }
    if (currentRank < previousRank) {
      return `- ${brandCode}: ${formatRank(previousRank)} -> ${formatRank(currentRank)} (▲${previousRank - currentRank})`;
    }
    return `- ${brandCode}: ${formatRank(previousRank)} -> ${formatRank(currentRank)} (▼${currentRank - previousRank})`;
  });
};

const getSnapshotRank = (snapshot, brandCode) => {
  if (!snapshot || !brandCode) return null;
  if (snapshot instanceof Map) {
    const value = snapshot.get(brandCode);
    return Number.isFinite(value) ? value : null;
  }
  const value = snapshot[brandCode];
  return Number.isFinite(value) ? value : null;
};

const buildHourlySnapshot = (activeBrands, latestByBrandCode) => {
  const snapshot = {};
  activeBrands.forEach((brand) => {
    const brandCode = String(brand.code || '').trim().toUpperCase();
    if (!brandCode) return;
    const latest = latestByBrandCode.get(brandCode);
    snapshot[brandCode] = Number.isFinite(latest?.bestOwnRank) ? latest.bestOwnRank : -1;
  });
  return snapshot;
};

const hasSnapshotChanges = (previousSnapshot, currentSnapshot) => {
  const allBrandCodes = new Set([
    ...Object.keys(previousSnapshot || {}),
    ...Object.keys(currentSnapshot || {}),
  ]);
  for (const brandCode of allBrandCodes) {
    const prev = getSnapshotRank(previousSnapshot, brandCode);
    const curr = getSnapshotRank(currentSnapshot, brandCode);
    if ((prev ?? -1) !== (curr ?? -1)) return true;
  }
  return false;
};

const buildComparisonsFromSnapshot = ({
  activeBrands,
  latestByBrandCode,
  previousSnapshot,
  previousByBrandCode,
}) =>
  activeBrands.map((brand) => {
    const brandCode = String(brand.code || '').trim().toUpperCase();
    const latest = latestByBrandCode.get(brandCode) || null;
    const previousSnapshotRank = getSnapshotRank(previousSnapshot, brandCode);
    return {
      brandCode,
      query: latest?.query || brandCode,
      primaryDomain: latest?.primaryDomain || '',
      currentRank: latest ? latest.bestOwnRank : null,
      previousRank: previousSnapshotRank !== null
        ? (previousSnapshotRank < 0 ? null : previousSnapshotRank)
        : (previousByBrandCode.get(brandCode)?.bestOwnRank ?? null),
    };
  });

const buildHourlyMessage = ({ comparisons, latestByBrandCode, now }) => {
  const s = summarizeChanges({ comparisons, latestByBrandCode });
  const detailLines = buildBrandDetailLines(comparisons);
  const lines = [
    `⏱️ Hourly Check — ${getWibClock(now)}`,
    '━━━━━━━━━━━━━━━━',
    `🏷️ ${comparisons.length} Brands Checked`,
    '',
    `✅ No change: ${s.noChangeCount} brands`,
    `📈 Improved: ${shortList(s.improved, '-')}`,
    `📉 Dropped: ${shortList(s.dropped, '-')}`,
    `❌ Not found: ${shortList(s.notFound, '-')}`,
    '',
    `🏆 Leading: ${s.leading ? `${s.leading.brandCode} ${s.leading.ownCount || 0}/10 (${s.leading.bestOwnRank ? `#${s.leading.bestOwnRank}` : 'No rank'})` : '-'}`,
    `⚠️ Worst: ${s.worst ? `${s.worst.brandCode} ${s.worst.ownCount || 0}/10` : '-'}`,
    '',
    `📋 Brand Details (${detailLines.length})`,
    ...detailLines,
    '━━━━━━━━━━━━━━━━',
  ];

  return lines.join('\n');
};

const buildInstantAlerts = ({ comparisons, threshold, alertOnDrop, alertOnNotFound, now }) => {
  const alerts = [];

  comparisons.forEach((item) => {
    const previousRank = item.previousRank;
    const currentRank = item.currentRank;

    if (alertOnNotFound && previousRank !== null && currentRank === null) {
      alerts.push(
        [
          `🚨 Alert — ${item.brandCode}`,
          '━━━━━━━━━━━━━━━━',
          `❌ ${item.primaryDomain || item.brandCode} dropped out of Top 10`,
          `🔑 Keyword: "${item.query || item.brandCode}"`,
          `📉 Was: #${previousRank} → Now: Not found`,
          `🕐 ${getWibClock(now)}`,
          '━━━━━━━━━━━━━━━━',
        ].join('\n')
      );
      return;
    }

    if (alertOnDrop && previousRank !== null && currentRank !== null && currentRank - previousRank >= threshold) {
      alerts.push(
        [
          `🚨 Alert — ${item.brandCode}`,
          '━━━━━━━━━━━━━━━━',
          `📉 Major drop detected`,
          `🔑 Keyword: "${item.query || item.brandCode}"`,
          `📊 #${previousRank} → #${currentRank} (▼${currentRank - previousRank})`,
          `🕐 ${getWibClock(now)}`,
          '━━━━━━━━━━━━━━━━',
        ].join('\n')
      );
    }
  });

  return alerts.slice(0, 8);
};

const buildDailyDigest = ({ runsToday, intervalMinutes, now }) => {
  const byBrand = new Map();
  runsToday.forEach((run) => {
    const key = String(run.brand?.code || '');
    if (!key) return;
    if (!byBrand.has(key)) byBrand.set(key, []);
    byBrand.get(key).push(run);
  });

  let bestBrand = null;
  let mostVolatile = null;
  let mostStable = null;
  let totalOwnCount = 0;
  let totalSlots = 0;

  byBrand.forEach((runs, brandCode) => {
    const ownCounts = runs.map((r) => Number(r.ownCount) || 0);
    const avgOwn = ownCounts.length ? ownCounts.reduce((a, b) => a + b, 0) / ownCounts.length : 0;
    const ranks = runs.map((r) => (Number.isFinite(r.bestOwnRank) ? r.bestOwnRank : null));
    let totalDrop = 0;
    let changes = 0;
    for (let i = 1; i < ranks.length; i += 1) {
      const a = ranks[i - 1];
      const b = ranks[i];
      if (a === b) continue;
      changes += 1;
      if (a !== null && b !== null && b > a) totalDrop += b - a;
      if (a !== null && b === null) totalDrop += 10;
    }

    const zeroAllDay = ownCounts.length > 0 && ownCounts.every((v) => v === 0);
    const zeroHours = zeroAllDay ? Math.round((runs.length * intervalMinutes) / 60) : 0;

    if (!bestBrand || avgOwn > bestBrand.avgOwn) {
      bestBrand = { brandCode, avgOwn };
    }
    if (!mostVolatile || totalDrop > mostVolatile.totalDrop) {
      mostVolatile = { brandCode, totalDrop };
    }
    if (!mostStable || changes < mostStable.changes) {
      mostStable = { brandCode, changes };
    }

    byBrand.set(brandCode, {
      runs,
      avgOwn,
      totalDrop,
      changes,
      zeroAllDay,
      zeroHours,
    });
  });

  runsToday.forEach((run) => {
    totalOwnCount += Number(run.ownCount) || 0;
    totalSlots += 10;
  });
  const ownRate = totalSlots > 0 ? Math.round((totalOwnCount / totalSlots) * 100) : 0;

  const zeroRows = Array.from(byBrand.entries())
    .map(([brandCode, meta]) => ({ brandCode, ...meta }))
    .filter((row) => row.zeroAllDay)
    .sort((a, b) => b.zeroHours - a.zeroHours);

  const dateKey = getWibDateKey(now).split('-').reverse().join('/');
  return [
    `🌙 Daily Summary — ${dateKey}`,
    '━━━━━━━━━━━━━━━━',
    `${runsToday.length} checks completed today`,
    '',
    `🏆 Best brand: ${bestBrand ? `${bestBrand.brandCode} avg ${bestBrand.avgOwn.toFixed(1)}/10` : '-'}`,
    `📉 Most volatile: ${mostVolatile ? `${mostVolatile.brandCode} (▼${mostVolatile.totalDrop} total)` : '-'}`,
    `✅ Most stable: ${mostStable ? `${mostStable.brandCode} (${mostStable.changes} changes)` : '-'}`,
    `❌ Zero appearances: ${
      zeroRows.length ? `${zeroRows[0].brandCode} (${Math.max(1, zeroRows[0].zeroHours)}hrs)` : '-'
    }`,
    '',
    `📊 Overall own domain rate: ${ownRate}%`,
    '━━━━━━━━━━━━━━━━',
  ].join('\n');
};

const createNotificationService = ({ telegramBotToken = '' } = {}) => {
  const sendTextToTargets = async ({ token, chatIds, text }) => {
    await Promise.all(chatIds.map((chatId) => sendTelegramText({ token, chatId, text })));
  };

  const processAutoCheckRun = async ({ settings, now = new Date() }) => {
    if (!settings?.notificationsEnabled) return;

    const token = getTelegramTokenFromSettings(
      { backupTelegramBotToken: settings.notificationTelegramBotToken },
      telegramBotToken
    );
    if (!token) return;

    const chatIds = normalizeChatIds(settings.notificationTelegramChatIds);
    if (!chatIds.length) return;

    const activeBrands = await Brand.find({ isActive: true }).select('_id code').sort({ code: 1 }).lean();
    if (!activeBrands.length) return;

    const activeBrandIds = activeBrands.map((b) => b._id);
    const recentRows = await SerpRun.find({ brand: { $in: activeBrandIds }, trigger: 'auto' })
      .sort({ checkedAt: -1 })
      .populate('brand', 'code')
      .lean();

    const latestByBrandCode = new Map();
    const previousByBrandCode = new Map();
    recentRows.forEach((row) => {
      const code = String(row.brand?.code || '').trim().toUpperCase();
      if (!code) return;
      if (!latestByBrandCode.has(code)) {
        latestByBrandCode.set(code, {
          brandCode: code,
          checkedAt: row.checkedAt,
          bestOwnRank: Number.isFinite(row.bestOwnRank) ? row.bestOwnRank : null,
          ownCount: Number(row.ownCount) || 0,
          query: row.query || code,
          primaryDomain: '',
        });
        return;
      }
      if (!previousByBrandCode.has(code)) {
        previousByBrandCode.set(code, {
          bestOwnRank: Number.isFinite(row.bestOwnRank) ? row.bestOwnRank : null,
        });
      }
    });

    const comparisons = activeBrands.map((brand) => {
      const brandCode = String(brand.code || '').trim().toUpperCase();
      const latest = latestByBrandCode.get(brandCode) || null;
      const previous = previousByBrandCode.get(brandCode) || null;
      return {
        brandCode,
        query: latest?.query || brandCode,
        primaryDomain: latest?.primaryDomain || '',
        currentRank: latest ? latest.bestOwnRank : null,
        previousRank: previous ? previous.bestOwnRank : null,
      };
    });

    const intervalMinutes = Math.max(15, Math.round((Number(settings.checkIntervalHours) || 1) * 60));
    const wibParts = getWibDateParts(now);

    if (settings.notificationInstantEnabled) {
      const threshold = clamp(settings.notificationInstantDropThreshold, 1, 10, 3);
      const instantAlerts = buildInstantAlerts({
        comparisons,
        threshold,
        alertOnDrop: settings.notificationAlertOnDrop !== false,
        alertOnNotFound: settings.notificationAlertOnNotFound !== false,
        now,
      });
      for (const message of instantAlerts) {
        await sendTextToTargets({ token, chatIds, text: message });
      }
    }

    if (settings.notificationHourlyEnabled) {
      const slotKey = getWibHourSlotKey(now);
      const previousRunSnapshot = settings.notificationLastRunSnapshot || {};
      const currentSnapshot = buildHourlySnapshot(activeBrands, latestByBrandCode);
      const hasChanges = hasSnapshotChanges(previousRunSnapshot, currentSnapshot);
      const isNewHour = settings.notificationLastHourlySlotKey !== slotKey;
      const shouldSend = hasChanges || isNewHour;

      if (shouldSend) {
        const snapshotComparisons = buildComparisonsFromSnapshot({
          activeBrands,
          latestByBrandCode,
          previousSnapshot: previousRunSnapshot,
          previousByBrandCode,
        });
        const hourlyMessage = buildHourlyMessage({ comparisons: snapshotComparisons, latestByBrandCode, now });
        await sendTextToTargets({ token, chatIds, text: hourlyMessage });
        settings.notificationLastHourlySlotKey = slotKey;
        settings.notificationLastHourlySnapshot = currentSnapshot;
      }
      settings.notificationLastRunSnapshot = currentSnapshot;
    }

    if (settings.notificationDailyDigestEnabled) {
      const parsedTime = parseWibTime(settings.notificationDailyDigestTimeWib || '23:00') || { hour: 23, minute: 0 };
      const dateKey = getWibDateKey(now);
      const isAfterDigestTime =
        wibParts.hour > parsedTime.hour || (wibParts.hour === parsedTime.hour && wibParts.minute >= parsedTime.minute);

      if (isAfterDigestTime && settings.notificationLastDailyDigestDateKey !== dateKey) {
        const { start, end } = getWibDayRangeUtc(now);
        const runsToday = await SerpRun.find({
          trigger: 'auto',
          checkedAt: { $gte: start, $lt: end },
          brand: { $in: activeBrandIds },
        })
          .sort({ checkedAt: 1 })
          .populate('brand', 'code')
          .lean();

        const digestMessage = buildDailyDigest({ runsToday, intervalMinutes, now });
        await sendTextToTargets({ token, chatIds, text: digestMessage });
        settings.notificationLastDailyDigestDateKey = dateKey;
      }
    }
  };

  return {
    processAutoCheckRun,
  };
};

module.exports = {
  createNotificationService,
};
