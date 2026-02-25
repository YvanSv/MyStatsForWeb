/*"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { GENERAL_STYLES } from "../styles/general";

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
  period?: {
      // Format ISO "YYYY-MM-DD"
      date_min?: string;
      date_max?: string;
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
}*/
"use client";

import { useEffect, useState } from "react";
import { GENERAL_STYLES } from "../styles/general";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SIDEBAR_STYLES = {
  // Wrappers
  OVERLAY: (isVisible: boolean) => `
    fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-500 lg:hidden
    ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
  `,
  ASIDE: (isVisible: boolean) => `
    transition-all duration-500 ease-in-out
    fixed inset-y-0 left-0 z-[101] w-[300px] p-6
    ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
    lg:relative lg:translate-x-0 lg:z-0 lg:bg-transparent lg:border-none lg:p-0
    ${isVisible ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden'}
  `,
  STICKY_CARD: "w-[280px] lg:w-full sticky top-24 bg-bg2/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6",

  // Typography & Header
  TITLE: "text-xl font-hias text-vert",
  RESET_BTN: "text-[10px] uppercase text-gray-500 hover:text-white transition-colors",
  GROUP_TITLE_BTN: "w-full flex justify-between items-center mb-3 font-bold text-sm tracking-widest uppercase opacity-70 hover:opacity-100 transition-opacity",
  
  // Inputs
  SEARCH_INPUT: "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-vert/50 focus:bg-white/10 outline-none transition-all",
  DATE_INPUT: "bg-neutral-900 text-white border border-neutral-800 rounded-md p-2 text-xs focus:ring-1 focus:ring-vert outline-none transition-colors w-full",
  RANGE_TRACK: "w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert",

  // Range Stats
  RANGE_LABEL: "text-xs text-gray-400 font-bold uppercase tracking-wider group-hover:text-gray-200 transition-colors",
  RANGE_VALUE: "text-[10px] text-vert font-mono bg-vert/10 px-2 py-0.5 rounded-md",
  
  // Date Grid
  DATE_GRID: "grid grid-cols-2 gap-3",
  DATE_LABEL: "text-[10px] text-gray-500 uppercase tracking-tight"
};

export default function SidebarFilters({ config, loading, isVisible, toggleShowFilters }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const currentParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      currentParams[key] = value;
    });
    setLocalFilters(currentParams);
  }, [searchParams]);

  const handleLocalChange = (key: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();

    Object.entries(localFilters).forEach(([key, value]) => {
      if (value && value !== "") {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    // Fermer la sidebar sur mobile après application
    if (window.innerWidth < 1024) toggleShowFilters();
  };

  const resetFilters = () => {
    setLocalFilters({});
    router.push(pathname);
  };

  return (
    <>
      <div onClick={toggleShowFilters} className={SIDEBAR_STYLES.OVERLAY(isVisible)}/>
      <aside className={SIDEBAR_STYLES.ASIDE(isVisible)}>
        <div className={SIDEBAR_STYLES.STICKY_CARD}>
          <div className="pb-4 mb-2 border-b border-white/5">
            <button onClick={applyFilters} disabled={loading}
              className={`${GENERAL_STYLES.GREENBUTTON} rounded-2xl md:text-base disabled:opacity-50 w-full py-3`}
            >{loading ? 'Chargement...' : "Appliquer les filtres"}</button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className={`${SIDEBAR_STYLES.TITLE} font-semibold`}>Filtres</h2>
            <button onClick={resetFilters} className={SIDEBAR_STYLES.RESET_BTN}>
              Réinitialiser
            </button>
          </div>

          {config.search && (
            <FilterGroup title="Recherche">
              <div className="space-y-3">
                <SearchInput 
                  placeholder="Titre..." 
                  value={localFilters["track"] || ""} 
                  onChange={(v: string) => handleLocalChange("track", v)} 
                />
                <SearchInput 
                  placeholder="Album..." 
                  value={localFilters["album"] || ""} 
                  onChange={(v: string) => handleLocalChange("album", v)} 
                />
                <SearchInput 
                  placeholder="Artiste..." 
                  value={localFilters["artist"] || ""} 
                  onChange={(v: string) => handleLocalChange("artist", v)} 
                />
              </div>
            </FilterGroup>
          )}

          <FilterGroup title="Statistiques">
            <div className="space-y-6 pt-2">
              {['streams', 'minutes', 'engagement', 'rating'].map((stat) => (
                 config.stats[stat] && (
                   <RangeFilter key={stat} param={stat} onChange={handleLocalChange}
                    label={stat === 'play_count' ? 'Écoutes' : stat.charAt(0).toUpperCase() + stat.slice(1)}
                    unit={stat === 'engagement' ? "%" : ""}
                    min={config.stats[stat].min}
                    max={config.stats[stat].max}
                    valueMin={Number(localFilters[`${stat}_min`]) || config.stats[stat].min}
                    valueMax={Number(localFilters[`${stat}_max`]) || config.stats[stat].max}
                   />
                 )
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Période">
            <div className="pt-2">
              <div className={SIDEBAR_STYLES.DATE_GRID}>
                <div className="flex flex-col space-y-1">
                  <span className={SIDEBAR_STYLES.DATE_LABEL}>De</span>
                  <input 
                    type="date" 
                    className={SIDEBAR_STYLES.DATE_INPUT}
                    value={localFilters.date_min || ""}
                    onChange={(e) => handleLocalChange("date_min", e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <span className={SIDEBAR_STYLES.DATE_LABEL}>À</span>
                  <input 
                    type="date" 
                    className={SIDEBAR_STYLES.DATE_INPUT}
                    value={localFilters.date_max || ""}
                    onChange={(e) => handleLocalChange("date_max", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </FilterGroup>
        </div>
      </aside>
    </>
  );
}

// --- SOUS-COMPOSANTS ---
function SearchInput({ placeholder, value, onChange }: any) {
  return (
    <input 
      type="text" placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className={SIDEBAR_STYLES.SEARCH_INPUT} 
    />
  );
}

function FilterGroup({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="mb-4">
      <button onClick={() => setIsOpen(!isOpen)} className={SIDEBAR_STYLES.GROUP_TITLE_BTN}>
        {title} <span className="text-vert">{isOpen ? '−' : '+'}</span>
      </button>
      <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-2 pb-4">{children}</div>
      </div>
    </div>
  );
}

function RangeFilter({ label, param, min, max, valueMin, valueMax, unit = "", onChange }: any) {
  const step = label === "Rating" ? 0.05 : 1;
  return (
    <div className="flex flex-col gap-3 group">
      <div className="flex justify-between items-center">
        <span className={SIDEBAR_STYLES.RANGE_LABEL}>{label}</span>
        <span className={SIDEBAR_STYLES.RANGE_VALUE}>
          {Number(valueMin).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" ⟷ "} 
          {Number(valueMax).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={valueMin > valueMax ? valueMax : valueMin} 
          onChange={(e) => onChange(`${param}_min`, e.target.value > valueMax ? valueMax : e.target.value)} 
          className={SIDEBAR_STYLES.RANGE_TRACK}
        />
        <input type="range" min={min} max={max} step={step} value={valueMax < valueMin ? valueMin : valueMax} 
          onChange={(e) => onChange(`${param}_max`, e.target.value < valueMin ? valueMin : e.target.value)} 
          className={SIDEBAR_STYLES.RANGE_TRACK}
        />
      </div>
    </div>
  );
}