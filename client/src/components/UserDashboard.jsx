import { useEffect, useMemo, useState } from 'react';
import { BRAND_MAP } from '../constants/brandMap';

const INDONESIA_TIME_ZONE = 'Asia/Jakarta';
const formatDateTimeWib = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    timeZone: INDONESIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

function StatCard({ emoji, value, label, color = '#f59e0b' }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="text-3xl">{emoji}</span>
      <span className="text-3xl font-bold" style={{ color }}>{value ?? 0}</span>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

const formatRunTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('id-ID', {
    timeZone: INDONESIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// ── Modal ────────────────────────────────────────────────────────────────────
function RunModal({ selected, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!selected?.brand || !selected?.run) return null;
  const { brand, run } = selected;
  const results = (run.results || []).slice(0, 10);

  const badgeStyle = (badge) => {
    if (badge === 'OWN') return { bg: '#d1fae5', color: '#065f46', label: 'OWN' };
    return { bg: '#f1f5f9', color: '#475569', label: '?' };
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Auto-Check Summary</h2>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {brand.code}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">{formatDateTimeWib(run.checkedAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {[
            { label: 'Best Rank', value: run.bestOwnRank ? `#${run.bestOwnRank}` : '-', color: '#6366f1' },
            { label: 'Own', value: run.ownCount ?? 0, color: '#10b981' },
            { label: 'Unknown', value: run.unknownCount ?? 0, color: '#94a3b8' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center py-3 px-2">
              <span className="text-xl font-bold" style={{ color }}>{value}</span>
              <span className="mt-0.5 text-[10px] text-slate-400 text-center">{label}</span>
            </div>
          ))}
        </div>

        {/* Compact ranked list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1.5">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No results available.</p>
          ) : (
            results.map((row, idx) => {
              const bs = badgeStyle(row.badge);
              const cleanedTitle = String(row.title || '-').replace(/\s*(\.\.\.|…)\s*$/, '').trim() || '-';
              return (
                <div
                  key={`${row.rank}-${idx}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                  style={{ border: '1px solid #f1f5f9' }}
                >
                  {/* Rank bubble */}
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {row.rank}
                  </span>

                  {/* Domain + title + visit */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-700 break-all">
                        {row.domainHost || '-'}
                      </p>
                      <a
                        href={row.link || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`shrink-0 rounded-sm p-1 transition ${
                          row.link
                            ? 'bg-transparent text-sky-700 hover:text-black'
                            : 'pointer-events-none bg-slate-200 text-slate-400'
                        }`}
                        title={row.link ? 'Visit link' : 'No link available'}
                        aria-label={row.link ? `Visit result ${row.rank}` : `No link for result ${row.rank}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M14 3h7v7" />
                          <path d="M10 14 21 3" />
                          <path d="M21 14v7h-7" />
                          <path d="M3 10V3h7" />
                          <path d="M3 21h7v-7" />
                        </svg>
                      </a>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 break-words leading-snug">
                      {cleanedTitle}
                    </p>
                  </div>

                  {/* Badge pill */}
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                    style={{ backgroundColor: bs.bg, color: bs.color }}
                  >
                    {bs.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-slate-100">
          <p className="text-center text-xs text-slate-400">Press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">Esc</kbd> or click outside to close</p>
        </div>
      </div>
    </div>
  );
}

// ── Carousel Card ────────────────────────────────────────────────────────────
function BrandCarouselCard({ brand, active, selectedRunId, onSelectRun }) {
  const bStyle = BRAND_MAP[brand.code];
  const bg = bStyle?.bg || brand.color || '#64748b';
  const textColor = bStyle?.text || '#fff';

  const rankBadge = brand.currentRank ? { label: `#${brand.currentRank}` } : { label: 'No data' };
  const trendBadge =
    brand.trend === 'up'
      ? { label: `Up ${brand.delta}`, bg: 'rgba(52,211,153,0.25)', color: textColor }
      : brand.trend === 'down'
      ? { label: `Down ${Math.abs(brand.delta)}`, bg: 'rgba(251,113,133,0.25)', color: textColor }
      : { label: 'Stable', bg: 'rgba(255,255,255,0.15)', color: textColor };

  const recentRuns = brand.recentAutoChecks || [];

  return (
    <div
      className="select-none rounded-2xl p-6 shadow-lg transition-all duration-300"
      style={{
        background: bg,
        opacity: active ? 1 : 0.5,
        transform: active ? 'scale(1)' : 'scale(0.92)',
        minHeight: '270px',
        color: textColor,
      }}
    >
      <span className="text-2xl font-extrabold tracking-wide" style={{ color: textColor }}>
        {brand.code}
      </span>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: textColor }}>
          {rankBadge.label}
        </span>
        <span className="rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: trendBadge.bg, color: trendBadge.color }}>
          {trendBadge.label}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: textColor, opacity: 0.85 }}>
          Last 5 Auto Checks
        </p>

        {recentRuns.length === 0 ? (
          <p className="mt-2 text-xs" style={{ color: textColor, opacity: 0.72 }}>No auto checks yet</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {recentRuns.map((run) => {
              const isSelected = selectedRunId === run._id;
              const rankLabel = run.bestOwnRank ? `#${run.bestOwnRank}` : '-';
              return (
                <button
                  key={run._id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRun(brand, run);
                  }}
                  className="rounded-md px-2 py-1 text-left text-[11px] font-semibold transition"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
                    color: textColor,
                    border: isSelected ? '1px solid rgba(255,255,255,0.7)' : '1px solid transparent',
                  }}
                  title={`Best rank: ${rankLabel} | Own: ${run.ownCount ?? 0}`}
                >
                  <span>{formatRunTime(run.checkedAt)}</span>
                  <span className="ml-1 opacity-80">{rankLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carousel ─────────────────────────────────────────────────────────────────
function BrandCarousel({ brands, selectedRunId, onSelectRun }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= brands.length) setIndex(0);
  }, [brands.length, index]);

  if (!brands.length) return null;

  const prev = () => setIndex((i) => (i - 1 + brands.length) % brands.length);
  const next = () => setIndex((i) => (i + 1) % brands.length);
  const getCard = (offset) => brands[(index + offset + brands.length) % brands.length];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={prev}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-500 shadow transition hover:bg-slate-50"
        >{'<'}</button>

        <div className="hidden flex-1 grid-cols-3 items-center gap-4 lg:grid">
          <div className="cursor-pointer" onClick={prev}>
            <BrandCarouselCard brand={getCard(-1)} active={false} selectedRunId={selectedRunId} onSelectRun={onSelectRun} />
          </div>
          <BrandCarouselCard brand={getCard(0)} active={true} selectedRunId={selectedRunId} onSelectRun={onSelectRun} />
          <div className="cursor-pointer" onClick={next}>
            <BrandCarouselCard brand={getCard(1)} active={false} selectedRunId={selectedRunId} onSelectRun={onSelectRun} />
          </div>
        </div>

        <div className="flex-1 lg:hidden">
          <BrandCarouselCard brand={getCard(0)} active={true} selectedRunId={selectedRunId} onSelectRun={onSelectRun} />
        </div>

        <button
          type="button"
          onClick={next}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-500 shadow transition hover:bg-slate-50"
        >{'>'}</button>
      </div>

      <div className="flex justify-center gap-1.5">
        {brands.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === index ? '20px' : '8px',
              height: '8px',
              backgroundColor: i === index ? '#6366f1' : '#cbd5e1',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function UserDashboard({ username = 'User', brands = [], totalDomains = 0 }) {
  const totalBrands = brands.length;
  const searchedToday = brands.filter((b) => b.lastChecked).length;
  const inTop10 = brands.filter((b) => b.currentRank !== null && b.currentRank <= 10).length;
  const rankedFirst = brands.filter((b) => b.currentRank === 1).length;
  const [brandSearch, setBrandSearch] = useState('');
  const [modalRun, setModalRun] = useState(null); // { brand, run } | null

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((brand) => {
      const code = String(brand.code || '').toLowerCase();
      const name = String(brand.name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [brands, brandSearch]);

  // Track which chip is visually "selected" in the carousel (for highlight only)
  const [selectedRunId, setSelectedRunId] = useState('');

  const handleSelectRun = (brand, run) => {
    setSelectedRunId(run._id);
    setModalRun({ brand, run });
  };

  return (
    <section className="min-h-screen w-full space-y-4 overflow-hidden bg-slate-100 p-4 lg:p-6">
      {/* Modal */}
      {modalRun && (
        <RunModal selected={modalRun} onClose={() => setModalRun(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Welcome back, {username}!</h1>
          <p className="mt-0.5 text-sm text-slate-500">Here is what is happening with your brands today.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">{username}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard emoji="🏷️" value={totalBrands} label="Total Brands" color="#f59e0b" />
        <StatCard emoji="🌐" value={totalDomains} label="Total Domains" color="#6366f1" />
        <StatCard emoji="🔍" value={searchedToday} label="Searched Today" color="#f59e0b" />
        <StatCard emoji="🏆" value={inTop10} label="In Top 10" color="#10b981" />
        <StatCard emoji="🥇" value={rankedFirst} label="Ranked #1" color="#8b5cf6" />
      </div>

      {/* Carousel */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800">Brand Status Overview</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click a time chip on any card to view its run details</p>
          </div>
          <input
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            placeholder="Search brand code/name..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-72"
          />
        </div>

        {filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="font-semibold text-slate-700">No brands added yet.</p>
            <p className="text-sm text-slate-400">
              {brands.length === 0
                ? 'Go to Brand Management to add your first brand.'
                : 'No brands match your search.'}
            </p>
          </div>
        ) : (
          <BrandCarousel
            brands={filteredBrands}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
          />
        )}
      </div>
    </section>
  );
}

export default UserDashboard;
