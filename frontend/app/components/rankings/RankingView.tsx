"use client";

import SidebarFilters from "../SidebarFilters";
import { useViewMode } from "../../context/viewModeContext";
import { useShowFilters } from "../../context/showFiltersContext";
import { DataInfo } from "@/app/data/DataInfos";
import GridCell from "./GridCell";
import ListCell from "./ListCell";
import SmallGridCell from "./SmallGridCell";

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

export default function RankingView({title, type, items, sortConfig, onSort, loading, hasMore, loadMore, filterConfig }: RankingViewProps) {
  const { viewMode } = useViewMode();
  const { showFilters, toggleShowFilters } = useShowFilters();
  const normalizedItems: DataInfo[] = items.map(item => ({ ...item, type }));

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <SidebarFilters 
        config={filterConfig} 
        loading={loading} 
        isVisible={showFilters}
        toggleShowFilters={toggleShowFilters}
      />
      <section className="flex-1 w-full min-w-0 transition-all duration-500 ease-in-out">
        <div className="flex flex-col-reverse md:flex-row md:items-center justify-between lg:mb-4 gap-4">
          <div className="flex flex-row gap-2 w-full md:w-auto items-center mb-6">
            {/* Bouton Filtres : Plus compact sur mobile */}
            {!showFilters ? (
              <button 
                onClick={toggleShowFilters}
                className="flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm
                  font-semibold border duration-300 flex-1 md:flex-none bg-bg2 text-white border-white/10"
              ><span className="text-sm md:text-base">⚙️ Filtres</span></button>
            ) : (
              <button onClick={toggleShowFilters} className="greenbutton border-vert border flex-1 gap-2 px-4 flex items-center justify-center md:text-base texte-1 lg:px-5 lg:hover:scale-105"><CloseIcon/>Fermer</button>
            )}

            {/* Conteneur Sélecteur de Tri : Aligné à côté sur mobile */}
            <div className="relative flex-[1.5] md:flex-none group">
              <span className="absolute -top-2 left-4 px-1.5 bg-bg1 text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-gray-500 z-10">
                Trier par
              </span>

              <div className="relative flex items-center">
                <select 
                  value={sortConfig.sort}
                  onChange={(e) => onSort(e.target.value)}
                  className="
                    w-full bg-bg2 pl-4 pr-8 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium 
                    border border-white/10 outline-none text-white appearance-none
                    focus:border-vert/50 transition-all cursor-pointer
                  "
                >
                  <option value={type === 'track' ? 'title' : 'name'}>Nom</option>
                  <option value="play_count">Streams</option>
                  <option value="total_minutes">Temps</option>
                  <option value="engagement">Engagement</option>
                  <option value="rating">Rating</option>
                </select>

                <div className="absolute right-3 pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Bouton Inverser : Version mini */}
            <button
              onClick={() => onSort(sortConfig.sort)}
              className="
                aspect-square h-[34px] md:h-[42px] flex items-center justify-center 
                bg-bg2 border border-white/10 rounded-full text-white shrink-0
              "
            >
              <span className={`text-base md:text-xl transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                ⇅
              </span>
            </button>
          </div>

          <h1 className="text-3xl md:text-5xl font-hias tracking-tighter text-left md:text-right">
            {title} <span className="text-vert">{type}s</span>
          </h1>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-3">
            {normalizedItems.map((item, i) => (<ListCell key={item.spotify_id || item.id} element={item} index={i} sort={sortConfig.sort}/>))}
          </div>
        ) : viewMode === 'grid_sm' ? (
          <div className="grid grid-cols-5 md:grid-cols-7 xl:grid-cols-8 gap-1 md:gap-4">
            {normalizedItems.map((item, i) => (<SmallGridCell key={item.spotify_id || item.id} element={item} index={i} sort={sortConfig.sort} />))}
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-6">
            {normalizedItems.map((item, i) => (<GridCell key={item.spotify_id || item.id} element={item} index={i} sort={sortConfig.sort} />))}
          </div>
        )}

        {hasMore && (
          <div className="mt-12 flex justify-center pb-12">
            <button onClick={loadMore} disabled={loading}
              className="bg-bg2 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 disabled:opacity-50"
            >{loading ? "Chargement..." : "Charger plus"}</button>
          </div>
        )}
      </section>
    </div>
  );
}

const CloseIcon = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>