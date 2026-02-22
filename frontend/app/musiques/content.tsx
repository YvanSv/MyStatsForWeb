"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useApi } from "../hooks/useApi";
import { useViewMode } from "../context/viewModeContext";
import SidebarFilters from "../components/SidebarFilters";
import { useShowFilters } from "../context/showFiltersContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Track {
  spotify_id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration_ms: number;
  play_count: number;
  total_minutes: number;
  engagement: number;
  rating: number;
}

type SortKey = 'title' | 'total_minutes' | 'engagement' | 'play_count' | 'rating';

export default function MusiquesContent() {
  const searchParams = useSearchParams();
  const { viewMode } = useViewMode();
  const { getMusics, getMusicsMetadata } = useApi();
  const [musics, setMusics] = useState<Track[]>([]);
  const [metadata, setMetadata] = useState({ max_streams: 9999999, max_minutes: 9999999, max_rating: 5 });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { showFilters, toggleShowFilters } = useShowFilters();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = useMemo(() => ({
    sort: (searchParams.get("sort") as SortKey) || "play_count",
    direction: (searchParams.get("direction") as "asc" | "desc") || "desc",
    track: searchParams.get("track") || "",
    artist: searchParams.get("artist") || "",
    album: searchParams.get("album") || "",
    streams_min: searchParams.get("streams_min") || "0",
    streams_max: searchParams.get("streams_max") || "9999999",
    minutes_min: searchParams.get("minutes_min") || "0",
    minutes_max: searchParams.get("minutes_max") || "9999999",
    engagement_min: searchParams.get("engagement_min") || "0",
    engagement_max: searchParams.get("engagement_max") || "100",
    rating_min: searchParams.get("rating_min") || "0",
    rating_max: searchParams.get("rating_max") || "10",
  }), [searchParams]);

  const musicFilters = useMemo(() => ({
    search: { track: true, artist: true, album: true },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    }
  }), [metadata]);

  const fetchMusics = useCallback(async (currentOffset: number, isNewSort: boolean) => {
    setLoading(true); 
    try {
      const newData = await getMusics({
        offset: currentOffset,
        limit: 50,
        ...currentSort
      });

      setHasMore(newData.length === 50);
      setMusics(prev => (isNewSort || currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) { console.error("Erreur API :", err); }
    finally { setLoading(false); }
  }, [getMusics, currentSort]);

  useEffect(() => {
    getMusicsMetadata().then(setMetadata);
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchMusics(0, true);
  }, [searchParams, fetchMusics]);
  
  const handleSort = (key: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSort.sort === key) {
      params.set("direction", currentSort.direction === "desc" ? "asc" : "desc");
    } else {
      params.set("sort", key);
      params.set("direction", "desc");
    }
    params.set("offset", "0");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const loadMore = () => {
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    fetchMusics(nextOffset, false);
  };
  
  return (
      <div className="flex flex-col lg:flex-row gap-8">
        {/* La sidebar devient fixe/absolute sur mobile via son composant interne ou un wrapper ici */}
        {(showFilters || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <SidebarFilters config={musicFilters} loading={loading} isVisible={showFilters}/>
        )}

        <section className="flex-1 w-full min-w-0">
          <div className="flex flex-col-reverse md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Bouton Filtres */}
              <button onClick={() => toggleShowFilters()}
                className="bg-bg2 px-6 py-3 md:px-4 md:py-2 rounded-full text-sm font-medium border border-white/10 cursor-pointer hover:border-vert/50 transition-colors flex-1 md:flex-none"
              >{showFilters ? "✕ Fermer" : "⚙️ Filtres"}</button>

              {/* SÉLECTEUR DE TRI MOBILE - Apparaît seulement sous l'affichage 'lg' */}
              <div className="relative lg:hidden flex-1">
                <select 
                  value={currentSort.sort}
                  onChange={(e) => handleSort(e.target.value as SortKey)}
                  className="w-full bg-bg2 px-6 py-3 rounded-full text-sm font-medium border border-white/10 appearance-none cursor-pointer focus:border-vert/50 outline-none text-white"
                >
                  <option value="play_count">Trier par : Streams</option>
                  <option value="total_minutes">Trier par : Temps</option>
                  <option value="engagement">Trier par : Engagement</option>
                  <option value="rating">Trier par : Rating</option>
                  <option value="title">Trier par : Nom</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-titre font-hias tracking-tighter text-left md:text-right">
                Toutes mes <span className="text-vert">musiques</span>
            </h1>
          </div>

          {viewMode === 'list' ? (
            <ListView musics={musics} sortConfig={currentSort} onSort={handleSort} />
          ) : (
            <GridView musics={musics} sortConfig={currentSort} onSort={handleSort} />
          )}

          {hasMore && (
            <div className="mt-12 flex justify-center pb-12">
              <button
                onClick={loadMore}
                disabled={loading}
                className="bg-bg2 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 transition-all disabled:opacity-50"
              >
                {loading ? "Chargement..." : "Charger plus"}
              </button>
            </div>
          )}
        </section>
      </div>
  );
}

// --- VUES ---

function ListView({ musics, sortConfig, onSort }: { musics: Track[], sortConfig: any, onSort: (key: SortKey) => void }) {
  // Fonction utilitaire pour le rendu de la stat dynamique sur mobile
  const renderMobileStat = (track: Track) => {
    const sortKey = sortConfig.sort;
    if (sortKey === 'rating') return <div className="h-5 md:hidden" />;
    let value: string | number = "";
    let unit = "";
    switch (sortKey) {
      case 'play_count':
        value = track.play_count;
        unit = "STR";
        break;
      case 'engagement':
        value = `${track.engagement}%`;
        unit = "";
        break;
      case 'total_minutes':
      default:
        value = Math.round(track.total_minutes);
        unit = "MIN";
        break;
    }

    return (
      <div className="font-hias font-bold text-sm text-vert md:text-gray-300 md:font-normal">
        {value}
        <span className="text-[8px] ml-1 md:hidden opacity-70">{unit}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header : Masqué sur mobile car il casse le layout */}
      <div className="hidden lg:grid grid-cols-[50px_2fr_120px_140px_100px_80px_60px] items-center gap-4 px-4 mb-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
        <div/>
        <div className={`pl-16 cursor-pointer hover:text-white ${sortConfig.sort !== 'title' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('title')}>Titre {sortConfig.sort === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'total_minutes' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('total_minutes')}>Temps {sortConfig.sort === 'total_minutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'engagement' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('engagement')}>Engagement {sortConfig.sort === 'engagement' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'play_count' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('play_count')}>Streams {sortConfig.sort === 'play_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'rating' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('rating')}>Rating {sortConfig.sort === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
      </div>

      {musics.map((track, i) => (
        <div key={track.spotify_id} 
             className="group flex lg:grid lg:grid-cols-[40px_2fr_120px_140px_100px_80px_60px] items-center gap-3 md:gap-4 bg-bg2/30 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all">
          
          <div className="sm:block text-gray-500 font-mono text-sm md:text-lg">#{i + 1}</div>
          
          {/* Titre & Cover */}
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            <div className="relative h-12 w-12 md:h-14 md:w-14 flex-shrink-0 overflow-hidden rounded-lg shadow-lg">
              {track.cover && <Image src={track.cover} alt={track.title} fill sizes="56px" className="object-cover" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm md:text-base truncate group-hover:text-vert transition-colors">{track.title}</h3>
              <p className="text-gray-400 text-[10px] md:text-xs truncate">{track.artist} <span className="hidden md:inline">• {track.album}</span></p>
            </div>
          </div>

          {/* COLONNES DESKTOP (Masquées sur Mobile) */}
          <div className={`hidden lg:block text-center ${sortConfig.sort !== 'total_minutes' ? 'text-sm text-gray-400' : 'text-medium font-bold text-vert'}`}>{Math.round(track.total_minutes)} <span className="font-medium">min</span></div>
          <div className="hidden lg:flex justify-center">
             <div className="flex items-center gap-2">
                <span className={`${sortConfig.sort !== 'engagement' ? 'text-sm text-gray-400' : 'font-bold text-vert'}`}>{track.engagement}%</span>
                <div className="w-12 h-1 bg-rouge/50 rounded-full overflow-hidden">
                  <div className={`h-full ${sortConfig.sort !== 'engagement' ? 'bg-gray-400' : 'bg-vert'}`} style={{ width: `${track.engagement}%` }}></div>
                </div>
             </div>
          </div>
          <div className={`hidden lg:block text-center ${sortConfig.sort !== 'play_count' ? 'text-sm text-gray-400' : 'text-medium font-bold text-vert'}`}>{track.play_count}</div>
          
          {/* BLOC DYNAMIQUE MOBILE */}
          <div className="flex flex-col items-end justify-center gap-0.5 min-w-[70px] md:min-w-0">
            {/* Statistique contextuelle */}
            <div className="md:hidden">
              {renderMobileStat(track)}
            </div>
            
            {/* Rating (Toujours affiché) */}
            <div className={`text-xs text-right md:text-base w-full lg:text-center ${sortConfig.sort !== 'rating' ? 'text-sm' : 'font-bold'} ${track.rating >= 1.35 ? 'text-vert' : track.rating >= 0.8 ? 'text-jaune' : 'text-rouge'}`}>
              {track.rating}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GridView({ musics, sortConfig, onSort }: { musics: Track[], sortConfig: any, onSort: (key: SortKey) => void }) {
  return (
    <>
      <div className="hidden lg:flex justify-end gap-6 mb-8 text-[10px] uppercase font-bold tracking-widest text-gray-500">
        {(['title', 'total_minutes', 'engagement', 'play_count', 'rating'] as SortKey[]).map(key => (
          <button 
            key={key} 
            onClick={() => onSort(key)} 
            className={`uppercase hover:text-white transition-colors ${sortConfig.sort === key ? 'text-vert' : ''}`}
          >
            {key === 'title' ? 'Nom' : key.replace('_', ' ')} {sortConfig.sort === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        ))}
      </div>

      {/* MODIFICATION ICI : grid-cols-3 par défaut, gap-2 sur mobile */}
      <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6 gap-2 md:gap-6">
        {musics.map((track) => (
          <div key={track.spotify_id} className="group bg-bg2/30 backdrop-blur-md rounded-xl md:rounded-3xl border border-white/5 p-2 md:p-4 hover:border-vert/40 transition-all">
            
            {/* Image : Plus compacte (mb-2) et arrondis réduits (rounded-lg) */}
            <div className="relative aspect-square mb-2 md:mb-4 overflow-hidden rounded-lg md:rounded-2xl shadow-2xl">
              {track.cover && (
                <Image 
                  src={track.cover} 
                  alt={track.title} 
                  fill 
                  sizes="(max-width: 640px) 33vw, 200px" 
                  className="object-cover" 
                />
              )}
              
              {/* Badge Rating : Plus discret sur mobile */}
              <div className="absolute top-1 right-1 md:top-3 md:right-3 bg-black/60 backdrop-blur-md px-1 md:px-2 py-0.5 rounded-md border border-white/10">
                <span className={`${track.rating >= 1.35 ? 'text-vert' : track.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} font-bold text-[8px] md:text-xs`}>
                  {track.rating}
                </span>
              </div>
            </div>

            {/* Titre : On force une taille très petite (text-[10px]) pour éviter les débordements */}
            <h3 className="font-bold truncate text-[10px] md:text-sm mb-0.5 group-hover:text-vert transition-colors">
              {track.title}
            </h3>
            
            <p className="text-gray-400 text-[9px] md:text-[11px] truncate mb-1 md:mb-0">{track.artist}</p>

            {/* Footer : On peut cacher les détails complexes sur mobile 3-cols pour garder de la clarté */}
            <div className="hidden md:flex justify-between items-center pt-3 mt-3 border-t border-white/5">
              <span className={`text-[10px] uppercase font-bold ${sortConfig.sort !== 'play_count' ? 'text-gray-500' : 'text-vert'}`}>
                {track.play_count} streams
              </span>
              <span className={`text-[10px] uppercase font-bold ${sortConfig.sort !== 'total_minutes' ? 'text-gray-500' : 'text-vert'}`}>
                {track.total_minutes} min
              </span>
            </div>
            
            {/* Version mobile simplifiée des stats */}
            <div className="md:hidden flex justify-between items-center text-[8px] opacity-60 font-bold uppercase border-t border-white/5 pt-1">
               <span>{track.play_count}</span>
               <span className="text-vert">{track.engagement}%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}