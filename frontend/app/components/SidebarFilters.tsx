"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Types pour configurer quels filtres afficher
interface FilterConfig {
  search?: {
    track?: boolean;
    artist?: boolean;
    album?: boolean;
  };
  stats?: {
    streams?: { min: number; max: number };
    minutes?: { min: number; max: number };
    engagement?: { min: number; max: number };
    rating?: { min: number; max: number };
  };
}

interface SidebarFiltersProps {
  config: FilterConfig;
  loading?: boolean;
  isVisible: boolean;
}

export default function SidebarFilters({ config, loading, isVisible }: SidebarFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // État local pour les inputs avant de cliquer sur "Appliquer"
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});

  const handleLocalChange = (key: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(localFilters).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    params.set("offset", "0");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const resetFilters = () => {
    setLocalFilters({});
    router.push(pathname);
  };

  return (
    <aside className={`transition-all duration-300 ${isVisible ? 'w-full md:w-80 opacity-100' : 'w-0 overflow-hidden opacity-0 invisible'}`}>
      <div className="sticky top-24 bg-bg2/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
        {/* Actions principales */}
        <div className="pb-4 mb-2 border-b border-white/5">
          <button onClick={applyFilters} disabled={loading}
            className="w-full bg-vert text-black py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50">
            {loading ? 'Chargement...' : 'Appliquer les filtres'}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-hias text-vert">Filtres</h2>
          <button onClick={resetFilters} className="text-[10px] uppercase text-gray-500 hover:text-white">
            Réinitialiser
          </button>
        </div>

        {/* SECTION RECHERCHE (Conditionnelle) */}
        {config.search && (
          <FilterGroup title="Recherche">
            <div className="space-y-3">
              {config.search.track && (
                <SearchInput placeholder="Titre..." value={localFilters.track ?? searchParams.get("track") ?? ""} 
                             onChange={(v:string) => handleLocalChange("track", v)} />
              )}
              {config.search.artist && (
                <SearchInput placeholder="Artiste..." value={localFilters.artist ?? searchParams.get("artist") ?? ""} 
                             onChange={(v:string) => handleLocalChange("artist", v)} />
              )}
              {config.search.album && (
                <SearchInput placeholder="Album..." value={localFilters.album ?? searchParams.get("album") ?? ""} 
                             onChange={(v:string) => handleLocalChange("album", v)} />
              )}
            </div>
          </FilterGroup>
        )}

        {/* SECTION STATISTIQUES (Conditionnelle) */}
        {config.stats && (
          <FilterGroup title="Statistiques">
            <div className="space-y-6 pt-2">
              {config.stats.streams && (
                <RangeFilter label="Écoutes" param="streams" step={1} {...config.stats.streams}
                  valueMin={localFilters.streams_min ?? searchParams.get("streams_min") ?? config.stats.streams.min}
                  valueMax={localFilters.streams_max ?? searchParams.get("streams_max") ?? config.stats.streams.max}
                  onChange={handleLocalChange} />
              )}
              {config.stats.minutes && (
                <RangeFilter label="Minutes" param="minutes" step={1} {...config.stats.minutes}
                  valueMin={localFilters.minutes_min ?? searchParams.get("minutes_min") ?? config.stats.minutes.min}
                  valueMax={localFilters.minutes_max ?? searchParams.get("minutes_max") ?? config.stats.minutes.max}
                  onChange={handleLocalChange} />
              )}
              {config.stats.engagement && (
                <RangeFilter label="Engagement" param="%" step={1} {...config.stats.engagement}
                  valueMin={localFilters.engagement_min ?? searchParams.get("engagement_min") ?? config.stats.engagement.min}
                  valueMax={localFilters.engagement_max ?? searchParams.get("engagement_max") ?? config.stats.engagement.max}
                  onChange={handleLocalChange} />
              )}
              {config.stats.rating && (
                <RangeFilter label="Rating" param="rating" step={0.05} {...config.stats.rating}
                  valueMin={localFilters.rating_min ?? searchParams.get("rating_min") ?? config.stats.rating.min}
                  valueMax={localFilters.rating_max ?? searchParams.get("rating_max") ?? config.stats.rating.max}
                  onChange={handleLocalChange} />
              )}
            </div>
          </FilterGroup>
        )}
      </div>
    </aside>
  );
}

// --- SOUS-COMPOSANTS INTERNES ---
function SearchInput({ placeholder, value, onChange }: any) {
  return (
    <input type="text" placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-vert/50 outline-none transition-all" />
  );
}

function FilterGroup({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="mb-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center mb-3 font-bold text-sm tracking-widest uppercase opacity-70">
        {title} <span>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function RangeFilter({ label, param, min, max, valueMin, valueMax, step = 1, unit = "", onChange }: any) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-vert font-mono">{valueMin}-{valueMax}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={valueMin}
          onChange={(e) => {
            const val = Math.min(Number(e.target.value), Number(valueMax));
            onChange(`${param}_min`, val.toString());
          }}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"
        />
        <input
          type="range" min={min} max={max} step={step} value={valueMax}
          onChange={(e) => {
            const val = Math.max(Number(e.target.value), Number(valueMin));
            onChange(`${param}_max`, val.toString());
          }}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"
        />
      </div>
    </div>
  );
}