const SerpRun = require('../models/SerpRun');
const { DomainActivityLog, DOMAIN_ACTIVITY_ACTIONS } = require('../models/DomainActivityLog');
const { BackupRun } = require('../models/BackupRun');
const { ensureSettings, getSanitizedSettings } = require('../services/adminSettingsService');
const {
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
  minutesToHours,
  hoursToMinutes,
  isAllowedIntervalMinutes,
  getNextScheduledAt,
} = require('../services/scheduleTimeService');
const {
  parseWibTime,
  normalizeChatIds,
  VALID_BACKUP_FORMATS,
  VALID_BACKUP_FREQUENCIES,
  getBackupIntervalDays,
  getNextBackupAtFromNow,
  getTelegramTokenFromSettings,
  testTelegramTargets,
} = require('../services/backupService');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const notifyAdminUpdate = (req, payload = {}) => req.app.locals.emitAdminUpdate?.(payload);
const getLogLimit = (queryLimit) => {
  const limitRaw = Number(queryLimit);
  return Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 100;
};
const buildAutoCheckSlotStatuses = ({ logs, intervalMinutes }) => {
  const slotMs = Math.max(1, intervalMinutes) * 60 * 1000;
  const bySlot = new Map();

  logs.forEach((item) => {
    const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return;

    const slotStartMs = Math.floor(createdAt.getTime() / slotMs) * slotMs;
    const slotKey = String(slotStartMs);
    const existing = bySlot.get(slotKey) || { slotAt: new Date(slotStartMs), okCount: 0, failCount: 0 };

    if (item?.metadata?.ok === false) {
      existing.failCount += 1;
    } else {
      existing.okCount += 1;
    }

    bySlot.set(slotKey, existing);
  });

  return Array.from(bySlot.values())
    .map((item) => ({
      slotAt: item.slotAt,
      status: item.failCount > 0 ? 'Failure' : 'Success',
      okCount: item.okCount,
      failCount: item.failCount,
    }))
    .sort((a, b) => new Date(a.slotAt) - new Date(b.slotAt));
};

const getAdminSettings = async (req, res, next) => {
  try {
    const settings = await ensureSettings();
    return res.json(getSanitizedSettings(settings));
  } catch (error) {
    return next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const settings = await ensureSettings();
    const enabled = req.body.autoCheckEnabled;
    const intervalHours = toNumber(req.body.checkIntervalHours);
    const intervalMinutes = toNumber(req.body.checkIntervalMinutes);
    const effectiveIntervalMinutes = intervalMinutes !== null ? intervalMinutes : hoursToMinutes(intervalHours);
    const intervalChanged = intervalMinutes !== null || intervalHours !== null;

    // Time changes require restarting auto-check (stop then run) to take effect.
    if (intervalChanged && settings.autoCheckEnabled && enabled !== false) {
      return res.status(409).json({
        error: 'Stop auto check and run again to apply time change',
      });
    }

    if (typeof enabled === 'boolean') {
      const wasEnabled = settings.autoCheckEnabled;
      settings.autoCheckEnabled = enabled;
      if (enabled) {
        settings.nextAutoCheckAt = getNextScheduledAt(new Date(), hoursToMinutes(settings.checkIntervalHours));
        settings.autoCheckStartedBy = req.user?._id || settings.autoCheckStartedBy || null;
      }
      if (!wasEnabled && enabled) {
        await DomainActivityLog.create({
          action: DOMAIN_ACTIVITY_ACTIONS.AUTO_START,
          domain: 'AUTO-CHECK',
          domainHostKey: 'auto-check',
          note: `Auto-check started (${hoursToMinutes(settings.checkIntervalHours)} min interval)`,
          actor: req.user?._id || null,
          metadata: {
            intervalMinutes: hoursToMinutes(settings.checkIntervalHours),
            nextAutoCheckAt: settings.nextAutoCheckAt,
          },
        });
      }
      if (!enabled) {
        settings.nextAutoCheckAt = null;
        settings.autoCheckStartedBy = null;
      }
    }

    if (intervalChanged) {
      if (effectiveIntervalMinutes < MIN_INTERVAL_MINUTES || effectiveIntervalMinutes > MAX_INTERVAL_MINUTES) {
        return res.status(400).json({
          error: `checkIntervalMinutes must be between ${MIN_INTERVAL_MINUTES} and ${MAX_INTERVAL_MINUTES}`,
        });
      }
      if (!isAllowedIntervalMinutes(effectiveIntervalMinutes)) {
        return res.status(400).json({
          error: 'checkIntervalMinutes must be one of: 15, 30, 60',
        });
      }

      settings.checkIntervalHours = minutesToHours(effectiveIntervalMinutes);
      if (settings.autoCheckEnabled) {
        settings.nextAutoCheckAt = getNextScheduledAt(new Date(), effectiveIntervalMinutes);
      }
    }

    await settings.save();
    notifyAdminUpdate(req, { source: 'schedule-update' });
    return res.json(getSanitizedSettings(settings));
  } catch (error) {
    return next(error);
  }
};

const addApiKey = async (req, res, next) => {
  try {
    const { name, key, isActive } = req.body;
    if (!name?.trim() || !key?.trim()) {
      return res.status(400).json({ error: 'name and key are required' });
    }

    const settings = await ensureSettings();
    settings.serpApiKeys.push({
      name: name.trim(),
      key: key.trim(),
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    await settings.save();
    notifyAdminUpdate(req, { source: 'api-key-add' });
    return res.status(201).json(getSanitizedSettings(settings));
  } catch (error) {
    return next(error);
  }
};

const updateApiKey = async (req, res, next) => {
  try {
    const settings = await ensureSettings();
    const item = settings.serpApiKeys.id(req.params.keyId);
    if (!item) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const { name, key, isActive } = req.body;
    if (typeof name === 'string' && name.trim()) {
      item.name = name.trim();
    }
    if (typeof key === 'string' && key.trim()) {
      item.key = key.trim();
    }
    if (typeof isActive === 'boolean') {
      item.isActive = isActive;
    }

    await settings.save();
    notifyAdminUpdate(req, { source: 'api-key-update' });
    return res.json(getSanitizedSettings(settings));
  } catch (error) {
    return next(error);
  }
};

const deleteApiKey = async (req, res, next) => {
  try {
    const settings = await ensureSettings();
    const item = settings.serpApiKeys.id(req.params.keyId);
    if (!item) {
      return res.status(404).json({ error: 'API key not found' });
    }

    item.deleteOne();
    await settings.save();
    notifyAdminUpdate(req, { source: 'api-key-delete' });

    return res.json(getSanitizedSettings(settings));
  } catch (error) {
    return next(error);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const settings = await ensureSettings();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyLimit = Number(req.app.locals.serperMonthlyLimit) || 2500;

    const recentRuns = await SerpRun.find({}).sort({ checkedAt: -1 }).limit(20).populate('brand', 'code name');
    const lastRun = recentRuns[0] || null;
    const keyUsageRowsLifetime = await SerpRun.aggregate([
      {
        $match: {
          $or: [{ keyId: { $ne: null } }, { keyName: { $exists: true, $ne: '' } }],
        },
      },
      {
        $group: {
          _id: {
            keyId: '$keyId',
            keyName: '$keyName',
          },
          total: { $sum: 1 },
        },
      },
    ]);
    const keyUsageRowsMonth = await SerpRun.aggregate([
      {
        $match: {
          checkedAt: { $gte: monthStart },
          $or: [{ keyId: { $ne: null } }, { keyName: { $exists: true, $ne: '' } }],
        },
      },
      {
        $group: {
          _id: {
            keyId: '$keyId',
            keyName: '$keyName',
          },
          total: { $sum: 1 },
        },
      },
    ]);

    const getCountFromRows = (rows, key) => {
      const byId = rows.find((row) => row._id?.keyId && row._id.keyId.toString() === key._id.toString());
      if (byId) return byId.total || 0;

      const byName = rows.find((row) => row._id?.keyName && row._id.keyName === key.name);
      return byName?.total || 0;
    };

    const tokenSummary = await Promise.all(
      (settings.serpApiKeys || []).map(async (item) => {
        const totalRequestsMonth = getCountFromRows(keyUsageRowsMonth, item);
        const totalRequestsLifetime = getCountFromRows(keyUsageRowsLifetime, item);
        const remainingDisplay = Math.max(monthlyLimit - totalRequestsLifetime, 0);

        return {
          _id: item._id,
          name: item.name,
          isActive: item.isActive,
          monthlyLimit,
          totalRequests: totalRequestsMonth,
          totalRequestsLifetime,
          remainingEstimated: remainingDisplay,
          remainingReported: null,
          remainingDisplay,
          baselineRemaining: item.baselineRemaining,
          baselineCapturedAt: item.baselineCapturedAt,
          exhaustedAt: item.exhaustedAt,
          lastUsedAt: item.lastUsedAt,
          lastError: item.lastError,
        };
      })
    );

    const activeKeys = (settings.serpApiKeys || []).filter((item) => item.isActive);
    const cursor = Number(settings.activeKeyCursor) || 0;
    const rotationIndex = activeKeys.length ? cursor % activeKeys.length : -1;
    const rotationKey = rotationIndex >= 0 ? activeKeys[rotationIndex] : null;
    const lastUsedKey = (settings.serpApiKeys || [])
      .filter((item) => item.lastUsedAt)
      .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))[0] || null;

    const schedulerStatus = req.app.locals.autoCheckScheduler?.getStatus?.() || null;
    const backupSchedulerStatus = req.app.locals.backupScheduler?.getStatus?.() || null;
    const backupRuns = await BackupRun.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('triggeredBy', 'username email role');
    const intervalMinutes = hoursToMinutes(settings.checkIntervalHours || 1);
    const autoCheckLogWindowStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const autoCheckLogs = await DomainActivityLog.find({
      action: DOMAIN_ACTIVITY_ACTIONS.AUTO_CHECK,
      createdAt: { $gte: autoCheckLogWindowStart },
    })
      .select('createdAt metadata.ok')
      .sort({ createdAt: -1 })
      .limit(5000);
    const autoCheckSlotStatuses = buildAutoCheckSlotStatuses({
      logs: autoCheckLogs,
      intervalMinutes,
    });

    return res.json({
      settings: getSanitizedSettings(settings),
      tokens: tokenSummary,
      lastRun: lastRun
        ? {
            _id: lastRun._id,
            brand: lastRun.brand,
            checkedAt: lastRun.checkedAt,
            trigger: lastRun.trigger,
            bestOwnRank: lastRun.bestOwnRank,
          }
        : null,
      recentRunCount: recentRuns.length,
      schedulerStatus,
      backupSchedulerStatus,
      backupRuns,
      serperRuntime: {
        activeKeyCount: activeKeys.length,
        activeCursor: cursor,
        rotationKey: rotationKey
          ? {
              _id: rotationKey._id,
              name: rotationKey.name,
              lastUsedAt: rotationKey.lastUsedAt || null,
              lastError: rotationKey.lastError || '',
            }
          : null,
        lastUsedKey: lastUsedKey
          ? {
              _id: lastUsedKey._id,
              name: lastUsedKey.name,
              lastUsedAt: lastUsedKey.lastUsedAt || null,
              lastError: lastUsedKey.lastError || '',
            }
          : null,
      },
      autoCheckSlotStatuses,
    });
  } catch (error) {
    return next(error);
  }
};

const updateBackupSettings = async (req, res, next) => {
  try {
    const settings = await ensureSettings();
    const backupEnabled = req.body.backupEnabled;
    const backupFrequencyRaw = req.body.backupFrequency;
    const backupTimeWibRaw = req.body.backupTimeWib;
    const backupFormatRaw = req.body.backupFormat;
    const backupTelegramBotTokenRaw = req.body.backupTelegramBotToken;
    const backupTelegramChatIdsRaw = req.body.backupTelegramChatIds;

    if (typeof backupEnabled === 'boolean') {
      settings.backupEnabled = backupEnabled;
      settings.backupEveryDays = getBackupIntervalDays(settings.backupFrequency);
      if (backupEnabled) {
        settings.backupStartedBy = req.user?._id || settings.backupStartedBy || null;
        settings.nextBackupAt = getNextBackupAtFromNow(new Date(), settings.backupTimeWib || '00:00');
      } else {
        settings.backupStartedBy = null;
        settings.nextBackupAt = null;
      }
    }

    if (backupFrequencyRaw !== undefined) {
      const backupFrequency = String(backupFrequencyRaw).toLowerCase();
      if (!VALID_BACKUP_FREQUENCIES.includes(backupFrequency)) {
        return res.status(400).json({ error: 'backupFrequency must be one of: daily, twice_weekly, weekly, monthly' });
      }
      settings.backupFrequency = backupFrequency;
      settings.backupEveryDays = getBackupIntervalDays(backupFrequency);
      settings.backupTwiceWeeklyNextGapDays = 3;
      if (settings.backupEnabled) {
        settings.nextBackupAt = getNextBackupAtFromNow(new Date(), settings.backupTimeWib || '00:00');
      }
    }

    if (backupTimeWibRaw !== undefined) {
      const parsedTime = parseWibTime(String(backupTimeWibRaw || ''));
      if (!parsedTime) {
        return res.status(400).json({ error: 'backupTimeWib must be in HH:mm format' });
      }
      settings.backupTimeWib = parsedTime.normalized;
      if (settings.backupEnabled) {
        settings.nextBackupAt = getNextBackupAtFromNow(new Date(), settings.backupTimeWib);
      }
    }

    if (backupFormatRaw !== undefined) {
      const backupFormat = String(backupFormatRaw).toLowerCase();
      if (!VALID_BACKUP_FORMATS.includes(backupFormat)) {
        return res.status(400).json({ error: 'backupFormat must be one of: json, ndjson' });
      }
      settings.backupFormat = backupFormat;
    }

    if (backupTelegramBotTokenRaw !== undefined) {
      settings.backupTelegramBotToken = String(backupTelegramBotTokenRaw || '').trim();
    }

    if (backupTelegramChatIdsRaw !== undefined) {
      settings.backupTelegramChatIds = normalizeChatIds(backupTelegramChatIdsRaw);
    }

    await settings.save();
    notifyAdminUpdate(req, { source: 'backup-settings-update' });
    return res.json(getSanitizedSettings(settings));
  } catch (error) {
    return next(error);
  }
};

const runAutoNow = async (req, res, next) => {
  try {
    const scheduler = req.app.locals.autoCheckScheduler;
    if (!scheduler) {
      return res.status(500).json({ error: 'Auto check scheduler unavailable' });
    }

    await scheduler.runNowDetached();
    notifyAdminUpdate(req, { source: 'run-now' });
    return res.status(202).json({ ok: true, started: true, schedulerStatus: scheduler.getStatus() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
};

const stopAutoRun = async (req, res, next) => {
  try {
    const scheduler = req.app.locals.autoCheckScheduler;
    if (!scheduler) {
      return res.status(500).json({ error: 'Auto check scheduler unavailable' });
    }

    const settings = await ensureSettings();
    const wasEnabled = settings.autoCheckEnabled;
    settings.autoCheckEnabled = false;
    settings.nextAutoCheckAt = null;
    const previousStartedBy = settings.autoCheckStartedBy;
    settings.autoCheckStartedBy = null;
    await settings.save();

    if (wasEnabled || scheduler.getStatus()?.isRunning) {
      await DomainActivityLog.create({
        action: DOMAIN_ACTIVITY_ACTIONS.AUTO_STOP,
        domain: 'AUTO-CHECK',
        domainHostKey: 'auto-check',
        note: 'Auto-check stopped',
        actor: req.user?._id || previousStartedBy || null,
        metadata: {
          stopRequestedWhileRunning: scheduler.getStatus()?.isRunning || false,
        },
      });
    }

    const stopRequested = scheduler.requestStop();
    notifyAdminUpdate(req, { source: 'stop-run' });
    return res.json({
      ok: true,
      stopRequested,
      schedulerStatus: scheduler.getStatus(),
      settings: getSanitizedSettings(settings),
    });
  } catch (error) {
    return next(error);
  }
};

const getDomainActivityLogs = async (req, res, next) => {
  try {
    const limit = getLogLimit(req.query.limit);

    const logs = await DomainActivityLog.find({
      action: {
        $in: [DOMAIN_ACTIVITY_ACTIONS.ADD, DOMAIN_ACTIVITY_ACTIONS.DELETE],
      },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('brand', 'code name')
      .populate('actor', 'username email role');

    return res.json(logs);
  } catch (error) {
    return next(error);
  }
};

const runBackupNow = async (req, res, next) => {
  try {
    const scheduler = req.app.locals.backupScheduler;
    if (!scheduler) {
      return res.status(500).json({ error: 'Backup scheduler unavailable' });
    }

    await scheduler.runNowDetached({ triggeredBy: req.user?._id || null });
    notifyAdminUpdate(req, { source: 'backup-run-now' });
    return res.status(202).json({ ok: true, started: true, backupSchedulerStatus: scheduler.getStatus() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
};

const testBackupTelegram = async (req, res, next) => {
  try {
    const settings = await ensureSettings();
    const telegramBotToken = getTelegramTokenFromSettings(
      {
        backupTelegramBotToken: req.body?.backupTelegramBotToken ?? settings.backupTelegramBotToken,
      },
      process.env.TELEGRAM_BOT_TOKEN || ''
    );
    const inputChatIds =
      req.body?.backupTelegramChatIds !== undefined ? req.body.backupTelegramChatIds : settings.backupTelegramChatIds;
    const normalizedChatIds = normalizeChatIds(inputChatIds);

    const result = await testTelegramTargets({
      telegramBotToken,
      chatIds: normalizedChatIds,
      text: req.body?.message,
    });

    return res.json({
      ok: result.failCount === 0,
      ...result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
};

const getAutoCheckLogs = async (req, res, next) => {
  try {
    const limit = getLogLimit(req.query.limit);

    const logs = await DomainActivityLog.find({
      action: {
        $in: [
          DOMAIN_ACTIVITY_ACTIONS.AUTO_START,
          DOMAIN_ACTIVITY_ACTIONS.AUTO_STOP,
          DOMAIN_ACTIVITY_ACTIONS.AUTO_CHECK,
        ],
      },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('brand', 'code name')
      .populate('actor', 'username email role');

    return res.json(logs);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminSettings,
  updateSchedule,
  updateBackupSettings,
  addApiKey,
  updateApiKey,
  deleteApiKey,
  getAdminDashboard,
  runAutoNow,
  runBackupNow,
  testBackupTelegram,
  stopAutoRun,
  getDomainActivityLogs,
  getAutoCheckLogs,
};

