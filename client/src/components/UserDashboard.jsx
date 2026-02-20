import { useState } from 'react';
import { BRAND_MAP } from '../constants/brandMap';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ emoji, value, label, color = '#f59e0b' }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col gap-2">
      <span className="text-3xl">{emoji}</span>
      <span className="text-3xl font-bold" style={{ color }}>{value ?? 0}</span>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

// ─── Brand Carousel Card ──────────────────────────────────────────────────────
function BrandCarouselCard({ brand, active }) {
  const bStyle = BRAND_MAP[brand.code];
  const bg = bStyle?.bg || brand.color || '#64748b';
  const textColor = bStyle?.text || '#fff';

  const rankBadge = brand.currentRank
    ? { label: `#${brand.currentRank}` }
    : { label: 'No data' };

  const trendBadge =
    brand.trend === 'up'
      ? { label: `↑ ${brand.delta}`, bg: 'rgba(52,211,153,0.25)', color: textColor }
      : brand.trend === 'down'
      ? { label: `↓ ${Math.abs(brand.delta)}`, bg: 'rgba(251,113,133,0.25)', color: textColor }
      : { label: '→ Stable', bg: 'rgba(255,255,255,0.15)', color: textColor };

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4 shadow-lg transition-all duration-300 select-none"
      style={{
        background: bg,
        opacity: active ? 1 : 0.45,
        transform: active ? 'scale(1)' : 'scale(0.92)',
        minHeight: '180px',
        color: textColor,
      }}
    >
      {/* Brand code */}
      <span className="text-2xl font-extrabold tracking-wide" style={{ color: textColor }}>
        {brand.code}
      </span>

      {/* Badges */}
      <div className="flex gap-2 flex-wrap">
        <span
          className="rounded-lg px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: textColor }}
        >
          {rankBadge.label}
        </span>
        <span
          className="rounded-lg px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: trendBadge.bg, color: trendBadge.color }}
        >
          {trendBadge.label}
        </span>
      </div>

      {/* Last check */}
      <span className="text-xs mt-auto" style={{ color: textColor, opacity: 0.7 }}>
        {brand.lastChecked
          ? `Checked ${new Date(brand.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Not checked today'}
      </span>
    </div>
  );
}

// ─── Brand Carousel ───────────────────────────────────────────────────────────
function BrandCarousel({ brands }) {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i - 1 + brands.length) % brands.length);
  const next = () => setIndex((i) => (i + 1) % brands.length);
  const getCard = (offset) => brands[(index + offset + brands.length) % brands.length];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* Left arrow */}
        <button
          type="button"
          onClick={prev}
          className="shrink-0 bg-white rounded-full shadow border border-slate-200 w-10 h-10 flex items-center justify-center text-xl text-slate-500 hover:bg-slate-50 transition"
        >
          ‹
        </button>

        {/* 3-card view */}
        <div className="flex-1 grid grid-cols-3 gap-4 items-center">
          <div className="cursor-pointer" onClick={prev}>
            <BrandCarouselCard brand={getCard(-1)} active={false} />
          </div>
          <BrandCarouselCard brand={getCard(0)} active={true} />
          <div className="cursor-pointer" onClick={next}>
            <BrandCarouselCard brand={getCard(1)} active={false} />
          </div>
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={next}
          className="shrink-0 bg-white rounded-full shadow border border-slate-200 w-10 h-10 flex items-center justify-center text-xl text-slate-500 hover:bg-slate-50 transition"
        >
          ›
        </button>
      </div>

      {/* Dot indicators */}
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function UserDashboard({ username = 'User', brands = [], totalDomains = 0 }) {
  const totalBrands = brands.length;
  const searchedToday = brands.filter((b) => b.lastChecked).length;
  const inTop10 = brands.filter((b) => b.currentRank !== null && b.currentRank <= 10).length;
  const rankedFirst = brands.filter((b) => b.currentRank === 1).length;

  return (
    <section className="min-h-screen bg-slate-100 p-4 lg:p-6 space-y-4 w-full overflow-hidden">

      {/* Header */}
      <div className="rounded-2xl bg-white px-6 py-5 shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Welcome back, {username}! 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">Here's what's happening with your brands today.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
          👤 {username}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard emoji="🏷️" value={totalBrands} label="Total Brands" color="#f59e0b" />
        <StatCard emoji="🌐" value={totalDomains} label="Total Domains" color="#6366f1" />
        <StatCard emoji="🔍" value={searchedToday} label="Searched Today" color="#f59e0b" />
        <StatCard emoji="✅" value={inTop10} label="In Top 10" color="#10b981" />
        <StatCard emoji="🥇" value={rankedFirst} label="Ranked #1" color="#8b5cf6" />
      </div>

      {/* Brand Carousel */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 px-6 py-5 flex-1">
        <h2 className="font-bold text-slate-800 mb-5">Brand Status Overview</h2>
        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-5xl">🏷️</span>
            <p className="font-semibold text-slate-700">No brands added yet.</p>
            <p className="text-sm text-slate-400">Go to "Brand Management" to add your first brand.</p>
          </div>
        ) : (
          <BrandCarousel brands={brands} />
        )}
      </div>
    </section>
  );
}

export default UserDashboard;