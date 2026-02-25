"use client";

import SidebarFilters from "../SidebarFilters";
import { useViewMode } from "../../context/viewModeContext";
import { useShowFilters } from "../../context/showFiltersContext";
import { DataInfo } from "@/app/data/DataInfos";
import GridCell from "./GridCell";
import ListCell from "./ListCell";
import SmallGridCell from "./SmallGridCell";
import { GENERAL_STYLES } from "@/app/styles/general";

interface RankingViewProps {
  title: string;
  type: 'track' | 'album' | 'artist';
  items: any[];
  sortConfig: any;
  onSort: (key: any) => void;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  filterConfig: any;
}

const RANKING_VIEW_STYLES = {
  // Layout Principal
  MAIN_CONTAINER: "flex flex-col lg:flex-row gap-8",
  CONTENT_SECTION: "flex-1 w-full min-w-0 transition-all duration-500 ease-in-out",
  
  // Header de la vue (Titre + Contrôles)
  HEADER_WRAPPER: "flex flex-col-reverse md:flex-row md:items-center justify-between lg:mb-4 gap-4",
  CONTROLS_GROUP: "flex flex-row gap-2 w-full md:w-auto items-center mb-6",

  // Boutons de Filtres
  BTN_FILTER_OFF: `flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 
                   rounded-full text-xs md:text-sm font-semibold border duration-300 
                   flex-1 md:flex-none bg-bg2 text-white border-white/10 hover:border-white/30`,
  BTN_FILTER_ON: `${GENERAL_STYLES.GREENBUTTON} border-vert border flex-1 gap-2 px-4 
                  flex items-center justify-center md:text-base lg:px-5 lg:hover:scale-105`,

  // Sélecteur de Tri (Select)
  SORT_SELECT_WRAPPER: "relative flex-[1.5] md:flex-none group",
  SORT_LABEL: "absolute -top-2 left-4 px-1.5 bg-bg1 text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-gray-500 z-10",
  SORT_SELECT: `w-full bg-bg2 pl-4 pr-8 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium 
                border border-white/10 outline-none text-white appearance-none
                focus:border-vert/50 transition-all cursor-pointer`,
  SORT_ICON_POS: "absolute right-3 pointer-events-none text-gray-400",

  // Bouton Direction (Asc/Desc)
  BTN_DIRECTION: `aspect-square h-[34px] md:h-[42px] flex items-center justify-center 
                  bg-bg2 border border-white/10 rounded-full text-white shrink-0
                  hover:border-white/30 transition-colors`,

  // Titre de la page
  PAGE_TITLE: "text-3xl md:text-5xl font-hias tracking-tighter text-left md:text-right",
  
  // Grilles de contenu (ViewModes)
  LIST_CONTAINER: "space-y-3",
  SMALL_GRID_CONTAINER: "grid grid-cols-5 md:grid-cols-7 xl:grid-cols-8 gap-1 md:gap-4",
  GRID_CONTAINER: "grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-6",

  // Footer / Load More
  LOAD_MORE_WRAPPER: "mt-12 flex justify-center pb-12",
  BTN_LOAD_MORE: "bg-bg2 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 disabled:opacity-50 transition-all active:scale-95"
};

export default function RankingView({ title, type, items, sortConfig, onSort, loading, hasMore, loadMore, filterConfig }: RankingViewProps) {
  const { viewMode } = useViewMode();
  const { showFilters, toggleShowFilters } = useShowFilters();
  const normalizedItems: DataInfo[] = items.map(item => ({ ...item, type }));

  return (
    <div className={RANKING_VIEW_STYLES.MAIN_CONTAINER}>
      <SidebarFilters 
        config={filterConfig} 
        loading={loading} 
        isVisible={showFilters}
        toggleShowFilters={toggleShowFilters}
      />
      
      <section className={RANKING_VIEW_STYLES.CONTENT_SECTION}>
        <div className={RANKING_VIEW_STYLES.HEADER_WRAPPER}>
          <div className={RANKING_VIEW_STYLES.CONTROLS_GROUP}>
            
            {/* Bouton Filtres */}
            {!showFilters ? (
              <button onClick={toggleShowFilters} className={RANKING_VIEW_STYLES.BTN_FILTER_OFF}>
                <span className="text-sm md:text-base">⚙️ Filtres</span>
              </button>
            ) : (
              <button onClick={toggleShowFilters} className={RANKING_VIEW_STYLES.BTN_FILTER_ON}>
                <CloseIcon /> Fermer
              </button>
            )}

            {/* Sélecteur de Tri */}
            <div className={RANKING_VIEW_STYLES.SORT_SELECT_WRAPPER}>
              <span className={RANKING_VIEW_STYLES.SORT_LABEL}>Trier par</span>
              <div className="relative flex items-center">
                <select 
                  value={sortConfig.sort}
                  onChange={(e) => onSort(e.target.value)}
                  className={RANKING_VIEW_STYLES.SORT_SELECT}
                >
                  <option value={type === 'track' ? 'title' : 'name'}>Nom</option>
                  <option value="play_count">Streams</option>
                  <option value="total_minutes">Temps</option>
                  <option value="engagement">Engagement</option>
                  <option value="rating">Rating</option>
                </select>
                <div className={RANKING_VIEW_STYLES.SORT_ICON_POS}>
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            {/* Bouton Inverser */}
            <button onClick={() => onSort(sortConfig.sort)} className={RANKING_VIEW_STYLES.BTN_DIRECTION}>
              <span className={`text-base md:text-xl transition-transform duration-300 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                ⇅
              </span>
            </button>
          </div>

          <h1 className={RANKING_VIEW_STYLES.PAGE_TITLE}>
            {title} <span className="text-vert">{type}s</span>
          </h1>
        </div>

        {/* Rendu des Cellules selon le ViewMode */}
        <div className={
          viewMode === 'list' ? RANKING_VIEW_STYLES.LIST_CONTAINER :
          viewMode === 'grid_sm' ? RANKING_VIEW_STYLES.SMALL_GRID_CONTAINER :
          RANKING_VIEW_STYLES.GRID_CONTAINER
        }>
          {normalizedItems.map((item, i) => {
            const commonProps = { element: item, index: i, sort: sortConfig.sort };
            const itemKey = item.spotify_id || item.id;
            if (viewMode === 'list') return <ListCell key={itemKey} {...commonProps} />;
            if (viewMode === 'grid_sm') return <SmallGridCell key={itemKey} {...commonProps} />;
            return <GridCell key={itemKey} {...commonProps} />;
          })}
        </div>

        {hasMore && (
          <div className={RANKING_VIEW_STYLES.LOAD_MORE_WRAPPER}>
            <button onClick={loadMore} disabled={loading} className={RANKING_VIEW_STYLES.BTN_LOAD_MORE}>
              {loading ? "Chargement..." : "Charger plus"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// Icones utilitaires
const CloseIcon = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const ChevronDownIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>