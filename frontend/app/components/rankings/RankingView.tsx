"use client";

import SidebarFilters from "../SidebarFilters";
import { useViewMode } from "../../context/viewModeContext";
import { useShowFilters } from "../../context/showFiltersContext";
import { DataInfo } from "@/app/data/DataInfos";
import GridCell from "./GridCell";
import ListCell from "./ListCell";
import SmallGridCell from "./SmallGridCell";
import { PrimaryButton, SecondaryButton, TertiaryButton } from "../Atomic/Buttons";
import { useLanguage } from "@/app/context/languageContext";
import { MenuButton, PopoverMenu } from "../Atomic/Nav/Navbar";
import { Grid2X2, Grid3X3, List } from "lucide-react";

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
  MAIN_CONTAINER: "flex flex-col lg:flex-row py-8 px-4 sm:px-8 md:py-8 md:px-12 max-w-[1440px] mx-auto",
  CONTENT_SECTION: "flex-1 space-y-4",
  
  // Header de la vue (Titre + Contrôles)
  HEADER_WRAPPER: "flex flex-col-reverse md:flex-row md:items-center justify-between lg:mb-4 gap-4",

  // Sélecteur de Tri (Select)
  SORT_SELECT_WRAPPER: "relative flex-[1.5] md:flex-none group",
  SORT_LABEL: `text3 absolute -top-2 left-4 px-1.5 bg-bg1 text-[8px] md:text-[10px] font-bold uppercase tracking-wider z-10`,
  SORT_ICON_POS: `text3 absolute right-3 pointer-events-none`,
  RIGHT_WRAPPER: "relative group",

  // Titre de la page
  PAGE_TITLE: "text-3xl md:text-5xl tracking-tighter text-left md:text-right",
  
  // Grilles de contenu (ViewModes)
  LIST_CONTAINER: "space-y-2.5",
  SMALL_GRID_CONTAINER: "grid grid-cols-5 md:grid-cols-7 xl:grid-cols-8 gap-1 md:gap-4",
  GRID_CONTAINER: "grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-6",
};

export default function RankingView({ title, type, items, sortConfig, onSort, loading, hasMore, loadMore, filterConfig }: RankingViewProps) {
  const { showFilters, toggleShowFilters } = useShowFilters();
  const { viewMode, toggleViewMode } = useViewMode();
  const { t } = useLanguage();
  const dict = t.ranking;

  const normalizedItems: DataInfo[] = items.map(item => ({ ...item, type }));

  const views = [
    { id: 'grid_sm', label: dict.viewGridSm, icon: <Grid3X3/>, hideMobile: true },
    { id: 'grid', label: dict.viewGrid, icon: <Grid2X2/>, hideMobile: false },
    { id: 'list', label: dict.viewList, icon: <List/>, hideMobile: false },
  ] as const;

  const activeView = views.find(v => v.id === viewMode) || views[1];

  return (
    <main className={`text1 min-h-screen relative overflow-hidden`}>
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
                <SecondaryButton onClick={toggleShowFilters} additional="px-4 py-2 md:px-5 md:py-2.5">
                  <span className="text-sm md:text-base">⚙️ {dict.filterBtn}</span>
                </SecondaryButton>
              ) : (
                <PrimaryButton onClick={toggleShowFilters} additional="border border-vert gap-2 px-4 py-2 md:px-5 md:py-2.5 md:text-base">
                  <CloseIcon /> {dict.closeBtn}
                </PrimaryButton>
              )}

              {/* Sélecteur Tri */}
              <div className={RANKING_VIEW_STYLES.SORT_SELECT_WRAPPER}>
                <span className={RANKING_VIEW_STYLES.SORT_LABEL}>{dict.sortBy}</span>
                <div className="relative flex items-center">
                  <select 
                    value={sortConfig.sort}
                    onChange={(e) => onSort(e.target.value)}
                    className={"pl-4 pr-8 py-2 md:py-2.5 rounded-full text-xs md:text-sm outline-none appearance-none cursor-pointer border border-white/10 hover:border-white/20 hover:bg-white/5 font-semibold text1"}
                  >
                    <option value={type === 'track' ? 'title' : 'name'}>{dict.sortOptions.name}</option>
                    <option value="play_count">{dict.sortOptions.play_count}</option>
                    <option value="total_minutes">{dict.sortOptions.total_minutes}</option>
                    <option value="engagement">{dict.sortOptions.engagement}</option>
                    <option value="rating">{dict.sortOptions.rating}</option>
                  </select>
                  <div className={RANKING_VIEW_STYLES.SORT_ICON_POS}>
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>

              {/* Bouton Direction */}
              <SecondaryButton onClick={() => onSort(sortConfig.sort)} additional="aspect-square h-[34px] md:h-[42px] shrink-0">
                <span className={`text-base md:text-xl transition-transform duration-300 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                  ⇅
                </span>
              </SecondaryButton>

              {/* View Mode Selector */}
              <div className={RANKING_VIEW_STYLES.RIGHT_WRAPPER}>
                <SecondaryButton additional="text2 flex flex-col items-center p-1 lg:p-2 justify-center">
                  <div className="flex items-center justify-center">{activeView.icon}</div>
                </SecondaryButton>
      
                <PopoverMenu>
                  {views.map(v => (
                    <MenuButton key={v.id} onClick={() => toggleViewMode(v.id)} additional={`duration-300 ease-out
                        ${viewMode === v.id ? `text2 bg-white/5` : `text3 hover:text-white hover:bg-white/5`}
                        ${v.hideMobile ? 'hidden lg:flex' : 'flex'}
                      `}
                    >{v.icon}</MenuButton>
                  ))}
                </PopoverMenu>
              </div>
            </div>

            {/* Titre de la page */}
            <h1 className={RANKING_VIEW_STYLES.PAGE_TITLE}>
              {title} <span className="text2">{dict.types[type]}</span>
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
              return <GridCell key={itemKey} {...commonProps} />;
            })}
          </div>

          {/* LOAD MORE */}
          {(hasMore && !loading) && (
            <div className="flex justify-center">
              <SecondaryButton onClick={loadMore} additional="px-8 py-4 disabled:opacity-50">
                {loading ? dict.loading : dict.loadMore}
              </SecondaryButton>
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