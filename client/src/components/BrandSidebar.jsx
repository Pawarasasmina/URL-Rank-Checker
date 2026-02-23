import { useMemo, useState } from 'react';
import { BRAND_MAP } from '../constants/brandMap';

function BrandSidebar({ brands, selectedBrandId, onSelect }) {
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((brand) =>
      [brand.code, brand.name].some((part) => part?.toLowerCase().includes(q))
    );
  }, [brands, search]);

  return (
    <>
      <div className="border-b border-slate-200 bg-white p-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">Brand List</p>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Browse Brands
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {brands.map((brand) => {
            const active = selectedBrandId === brand._id;
            return (
              <button
                key={brand._id}
                type="button"
                onClick={() => onSelect(brand)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {brand.code}
              </button>
            );
          })}
          {brands.length === 0 && (
            <p className="text-xs text-slate-500">No brands available.</p>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close brand panel"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Brands</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Search code or name..."
            />
            <div className="space-y-2">
              {filteredBrands.map((brand) => {
                const active = selectedBrandId === brand._id;
                const brandStyle = BRAND_MAP[brand.code];
                const circleColor = brandStyle?.color || brand.color || '#64748b';

                return (
                  <button
                    key={brand._id}
                    type="button"
                    onClick={() => {
                      onSelect(brand);
                      setMobileOpen(false);
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-left transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: circleColor }}
                      />
                      <span className="font-semibold uppercase text-indigo-700">{brand.code}</span>
                    </div>
                    <div className="mt-1 flex justify-end">
                      {brandStyle ? (
                        <span
                          className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                          style={{ background: brandStyle.bg, color: brandStyle.text }}
                        >
                          {brand.name}
                        </span>
                      ) : (
                        <p className="text-sm text-slate-700">{brand.name}</p>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredBrands.length === 0 && (
                <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  No brands found.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:sticky lg:top-[76px] lg:flex lg:h-[calc(100vh-76px)] lg:w-80 lg:shrink-0 lg:flex-col">
        <h2 className="mb-3 text-lg font-semibold">Brands</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Search code or name..."
        />

        <div className="space-y-2 overflow-y-auto lg:flex-1">
          {filteredBrands.map((brand) => {
            const active = selectedBrandId === brand._id;
            const brandStyle = BRAND_MAP[brand.code];
            const circleColor = brandStyle?.color || brand.color || '#64748b';

            return (
              <button
                key={brand._id}
                type="button"
                onClick={() => onSelect(brand)}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  active
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: circleColor }}
                  />
                  <span className="font-semibold uppercase text-indigo-700">{brand.code}</span>
                </div>
                <div className="mt-1 flex justify-end">
                  {brandStyle ? (
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                      style={{ background: brandStyle.bg, color: brandStyle.text }}
                    >
                      {brand.name}
                    </span>
                  ) : (
                    <p className="text-sm text-slate-700">{brand.name}</p>
                  )}
                </div>
              </button>
            );
          })}

          {filteredBrands.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
              No brands found.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

export default BrandSidebar;
