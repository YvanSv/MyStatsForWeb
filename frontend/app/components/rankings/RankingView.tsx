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
  MAIN_CONTAINER: "flex flex-col lg:flex-row gap-8 py-8 px-12 md:py-12 md:px-16 max-w-[1440px] mx-auto",
  CONTENT_SECTION: "flex-1 space-y-10",
  
  // Header de la vue (Titre + Contrôles)
  HEADER_WRAPPER: "flex flex-col-reverse md:flex-row md:items-center justify-between lg:mb-4 gap-4",
  CONTROLS_GROUP: "flex flex-row gap-2 w-full md:w-auto items-center mb-6",

  // Boutons de Filtres
  BTN_FILTER_OFF: `${GENERAL_STYLES.GRAYBUTTON} px-4 py-2 md:px-5 md:py-2.5`,
  BTN_FILTER_ON: `${GENERAL_STYLES.GREENBUTTON} rounded-full border-vert border flex-1 gap-2 px-4 
                  flex items-center justify-center md:text-base lg:px-5`,

  // Sélecteur de Tri (Select)
  SORT_SELECT_WRAPPER: "relative flex-[1.5] md:flex-none group",
  SORT_LABEL: `${GENERAL_STYLES.TEXT3} absolute -top-2 left-4 px-1.5 bg-bg1 text-[8px] md:text-[10px] font-bold uppercase tracking-wider z-10`,
  SORT_SELECT: `${GENERAL_STYLES.GRAYBUTTON} pl-4 pr-8 py-2 md:py-2.5 rounded-full text-xs md:text-sm
                outline-none appearance-none`,
  SORT_ICON_POS: `${GENERAL_STYLES.TEXT3} absolute right-3 pointer-events-none`,

  // Bouton Direction (Asc/Desc)
  BTN_DIRECTION: `aspect-square h-[34px] md:h-[42px] shrink-0 ${GENERAL_STYLES.GRAYBUTTON}`,

  // Titre de la page
  PAGE_TITLE: "text-3xl md:text-5xl font-hias tracking-tighter text-left md:text-right",
  
  // Grilles de contenu (ViewModes)
  LIST_CONTAINER: "space-y-3",
  SMALL_GRID_CONTAINER: "grid grid-cols-5 md:grid-cols-7 xl:grid-cols-8 gap-1 md:gap-4",
  GRID_CONTAINER: "grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-6",

  // Footer / Load More
  LOAD_MORE_WRAPPER: "mt-12 flex justify-center pb-12",
  BTN_LOAD_MORE: `${GENERAL_STYLES.GRAYBUTTON} px-8 py-4 disabled:opacity-50`
};

export default function RankingView({ title, type, items, sortConfig, onSort, loading, hasMore, loadMore, filterConfig }: RankingViewProps) {
  const { viewMode } = useViewMode();
  const { showFilters, toggleShowFilters } = useShowFilters();
  const normalizedItems: DataInfo[] = items.map(item => ({ ...item, type }));

  return (
    <main className={`${GENERAL_STYLES.TEXT1} min-h-screen relative overflow-hidden`}>
      <div className={RANKING_VIEW_STYLES.MAIN_CONTAINER}>
        {/* SIDEBAR FILTERS */}
        <SidebarFilters config={filterConfig} loading={loading}
          isVisible={showFilters} toggleShowFilters={toggleShowFilters}
        />

        {/* MAIN CONTENT SECTION */}
        <section className={RANKING_VIEW_STYLES.CONTENT_SECTION}>
          {/* HEADER CONTROLS */}
          <div className={RANKING_VIEW_STYLES.HEADER_WRAPPER}>
            <div className="flex items-center gap-3">
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

              {/* Sélecteur Tri */}
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

              {/* Bouton Direction */}
              <button onClick={() => onSort(sortConfig.sort)} className={RANKING_VIEW_STYLES.BTN_DIRECTION}>
                <span className={`text-base md:text-xl transition-transform duration-300 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                  ⇅
                </span>
              </button>
            </div>

            {/* Titre de la page */}
            <h1 className={RANKING_VIEW_STYLES.PAGE_TITLE}>
              {title} <span className={GENERAL_STYLES.TEXT2}>{type}s</span>
            </h1>
          </div>

          {/* ITEMS CONTAINER */}
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
              console.log(items);
              return <GridCell key={itemKey} {...commonProps} />;
            })}
          </div>

          {/* LOAD MORE */}
          {hasMore && (
            <div className={RANKING_VIEW_STYLES.LOAD_MORE_WRAPPER}>
              <button onClick={loadMore} disabled={loading} className={RANKING_VIEW_STYLES.BTN_LOAD_MORE}>
                {loading ? "Chargement..." : "Charger plus"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// Icones utilitaires
const CloseIcon = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const ChevronDownIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>