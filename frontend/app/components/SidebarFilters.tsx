"use client";

import { useEffect, useState } from "react";
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
  toggleShowFilters: () => void;
}

export default function SidebarFilters({ config, loading, isVisible, toggleShowFilters }: SidebarFiltersProps) {
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
    if (window.innerWidth < 1024) toggleShowFilters();
  };

  const resetFilters = () => {
    setLocalFilters({});
    router.push(pathname);
  };

  useEffect(() => {
    if (isVisible && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isVisible]);

  return (
    <>
      {/* OVERLAY MOBILE : Fond sombre qui apparaît en fondu */}
      <div 
        onClick={toggleShowFilters}
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-500 lg:hidden
          ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      <aside className={`
        /* Animation et Transition */
        transition-all duration-500 ease-in-out
        /* Mobile : Tiroir fixe qui sort de la gauche */
        fixed inset-y-0 left-0 z-[101] w-[300px] p-6
        ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
        /* Desktop : Retour au flux normal */
        lg:relative lg:translate-x-0 lg:z-0 lg:bg-transparent lg:border-none lg:p-0
        ${isVisible ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden'}
      `}>
        
        {/* Wrapper pour éviter que le contenu ne se compresse pendant l'anim de largeur sur Desktop */}
        <div className="w-[280px] lg:w-full sticky top-24 bg-bg2/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
          
          {/* Actions principales */}
          <div className="pb-4 mb-2 border-b border-white/5">
            <button onClick={applyFilters} disabled={loading}
              className="w-full bg-vert text-black py-3 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Chargement...' : 'Appliquer les filtres'}
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-hias text-vert">Filtres</h2>
            <button onClick={resetFilters} className="text-[10px] uppercase text-gray-500 hover:text-white transition-colors">
              Réinitialiser
            </button>
          </div>

          {/* SECTION RECHERCHE */}
          {config.search && (
            <FilterGroup title="Recherche">
              <div className="space-y-3">
                {config.search.track && (
                  <SearchInput placeholder="Titre..." value={localFilters.track ?? ""} 
                               onChange={(v:string) => handleLocalChange("track", v)} />
                )}
                {config.search.artist && (
                  <SearchInput placeholder="Artiste..." value={localFilters.artist ?? ""} 
                               onChange={(v:string) => handleLocalChange("artist", v)} />
                )}
                {config.search.album && (
                  <SearchInput placeholder="Album..." value={localFilters.album ?? ""} 
                               onChange={(v:string) => handleLocalChange("album", v)} />
                )}
              </div>
            </FilterGroup>
          )}

          {/* SECTION STATISTIQUES */}
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
                  <RangeFilter label="Engagement" param="engagement" unit="%" step={0.1} {...config.stats.engagement}
                    valueMin={Number(localFilters.engagement_min ?? searchParams.get("engagement_min") ?? config.stats.engagement.min)}
                    valueMax={Number(localFilters.engagement_max ?? searchParams.get("engagement_max") ?? config.stats.engagement.max)}
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
    </>
  );
}

// --- SOUS-COMPOSANTS INTERNES ---
function SearchInput({ placeholder, value, onChange }: any) {
  return (
    <input type="text" placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-vert/50 focus:bg-white/10 outline-none transition-all" />
  );
}

function FilterGroup({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="mb-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center mb-3 font-bold text-sm tracking-widest uppercase opacity-70 hover:opacity-100 transition-opacity">
        {title} <span className={`transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}>{isOpen ? '−' : '+'}</span>
      </button>
      <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function RangeFilter({ label, param, min, max, valueMin, valueMax, step = 1, unit = "", onChange }: any) {
  return (
    <div className="flex flex-col gap-3 group">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider group-hover:text-gray-200 transition-colors">{label}</span>
        <span className="text-[10px] text-vert font-mono bg-vert/10 px-2 py-0.5 rounded-md">{valueMin}-{valueMax}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={valueMin}
          onChange={(e) => {
            const val = Math.min(Number(e.target.value), Number(valueMax));
            onChange(`${param}_min`, val.toString());
          }}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert hover:accent-vert/80 transition-all"
        />
        <input
          type="range" min={min} max={max} step={step} value={valueMax}
          onChange={(e) => {
            const val = Math.max(Number(e.target.value), Number(valueMin));
            onChange(`${param}_max`, val.toString());
          }}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert hover:accent-vert/80 transition-all"
        />
      </div>
    </div>
  );
}