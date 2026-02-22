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
      <div className="flex flex-col md:flex-row gap-8">
        <SidebarFilters config={musicFilters} loading={loading} isVisible={showFilters}/>

        <section className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => toggleShowFilters()}
              className="bg-bg2 px-4 py-2 rounded-full text-sm font-medium border border-white/10 cursor-pointer hover:border-vert/50 transition-colors"
            >{showFilters ? "Masquer les filtres" : "Afficher les filtres"}</button>
            <h1 className="text-titre font-hias tracking-tighter text-right">Toutes mes <span className="text-vert">musiques</span></h1>
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
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[50px_2fr_120px_140px_100px_80px_60px] items-center gap-4 px-4 mb-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
        <div/>
        <div className="pl-16 cursor-pointer hover:text-white" onClick={() => onSort('title')}>
          Titre {sortConfig.sort === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('total_minutes')}>
          Temps {sortConfig.sort === 'total_minutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('engagement')}>
          Engagement {sortConfig.sort === 'engagement' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('play_count')}>
          Streams {sortConfig.sort === 'play_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('rating')}>
          Rating {sortConfig.sort === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
      </div>

      {musics.map((track,i) => (
        <div key={track.spotify_id} className="group grid grid-cols-[40px_2fr_120px_140px_100px_80px_60px] items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
          <div className="text-gray-500 font-mono text-lg font-medium">
            #{i + 1}
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg shadow-lg bg-bg2">
              {track.cover && <Image src={track.cover} alt={track.title} fill sizes="56px" className="object-cover" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-tight group-hover:text-vert transition-colors truncate">{track.title}</h3>
              <p className="text-gray-400 text-xs truncate">{track.artist} • <span className="italic">{track.album}</span></p>
            </div>
          </div>
          <div className="text-center text-sm text-gray-200">{Math.round(track.total_minutes)} min</div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-vert font-medium">{track.engagement}%</span>
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="bg-vert h-full" style={{ width: `${track.engagement}%` }}></div>
              </div>
            </div>
          </div>
          <div className="text-center font-hias font-bold text-vert">{track.play_count}</div>
          <div className={`text-center font-bold ${track.rating >= 1.35 ? 'text-vert' : track.rating >= 0.8 ? 'text-jaune' : 'text-rouge'}`}>{track.rating}</div>
        </div>
      ))}
    </div>
  );
}

function GridView({ musics, sortConfig, onSort }: { musics: Track[], sortConfig: any, onSort: (key: SortKey) => void }) {
  return (
    <>
      <div className="flex justify-end gap-6 mb-8 text-[10px] uppercase font-bold tracking-widest text-gray-500">
        {(['name', 'total_minutes', 'engagement', 'play_count', 'rating'] as SortKey[]).map(key => (
          <button key={key} onClick={() => onSort(key)} className={`uppercase hover:text-white ${sortConfig.sort === key ? 'text-vert' : ''}`}>
            {key === 'title' ? 'Nom' : key.replace('_', ' ')} {sortConfig.sort === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {musics.map((track) => (
          <div key={track.spotify_id} className="group bg-bg2/30 backdrop-blur-md rounded-3xl border border-white/5 p-4 hover:border-vert/40 transition-all hover:-translate-y-1">
            <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-2xl">
              {track.cover && <Image src={track.cover} alt={track.title} fill sizes="150px" className="object-cover group-hover:scale-105 transition-transform duration-500" />}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                <span className={`${track.rating >= 1.35 ? 'text-vert' : track.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} font-bold text-xs`}>{track.rating}</span>
              </div>
            </div>
            <h3 className="font-bold truncate text-sm mb-1 group-hover:text-vert transition-colors">{track.title}</h3>
            <div className="flex justify-between">
              <p className="text-gray-400 text-[11px] truncate">{track.artist}</p>
              <span className="text-xs font-bold text-vert">{track.engagement}%</span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/5">
              <span className="text-[10px] uppercase text-gray-500 font-bold">{track.play_count} streams</span>
              <span className="text-[10px] uppercase text-gray-500 font-bold">{track.total_minutes} min</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}