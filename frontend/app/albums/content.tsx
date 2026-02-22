"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useApi } from "../hooks/useApi";
import { useViewMode } from "../context/viewModeContext";
import SidebarFilters from "../components/SidebarFilters";
import { useShowFilters } from "../context/showFiltersContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Album {
  spotify_id: string;
  name: string;
  artist: string;
  cover: string;
  play_count: number;
  total_minutes: number;
  rating: number;
  engagement: number;
}

type SortKey = 'name' | 'total_minutes' | 'play_count' | 'rating' | 'engagement';

export default function AlbumsContent() {
  const searchParams = useSearchParams();
  const { viewMode } = useViewMode();
  const { getAlbums, getAlbumsMetadata } = useApi();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [metadata, setMetadata] = useState({ max_streams: 99999999, max_minutes: 99999999, max_rating: 5 });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { showFilters, toggleShowFilters } = useShowFilters();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = useMemo(() => ({
    sort: (searchParams.get("sort") as SortKey) || "play_count",
    direction: (searchParams.get("direction") as "asc" | "desc") || "desc",
    artist: searchParams.get("artist") || "",
    album: searchParams.get("album") || "",
    streams_min: searchParams.get("streams_min") || "0",
    streams_max: searchParams.get("streams_max") || "99999999",
    minutes_min: searchParams.get("minutes_min") || "0",
    minutes_max: searchParams.get("minutes_max") || "99999999",
    engagement_min: searchParams.get("engagement_min") || "0",
    engagement_max: searchParams.get("engagement_max") || "100",
    rating_min: searchParams.get("rating_min") || "0",
    rating_max: searchParams.get("rating_max") || "10",
  }), [searchParams]);

  const albumFilters = {
    search: { album: true, artist: true },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    }
  };

  const fetchAlbums = useCallback(async (currentOffset: number, isNewSort: boolean) => {
    setLoading(true);
    try {
      const newData = await getAlbums({
        offset: currentOffset,
        limit: 50,
        ...currentSort
      });
      setHasMore(newData.length === 50);
      setAlbums(prev => (isNewSort || currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [getAlbums, currentSort]);
  
  useEffect(() => {
    getAlbumsMetadata().then(setMetadata);
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchAlbums(0, true);
  }, [searchParams, fetchAlbums]);

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
    fetchAlbums(nextOffset, false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <SidebarFilters config={albumFilters} loading={loading} isVisible={showFilters}/>

      <section className="flex-1">
        {/* Header de la section */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => toggleShowFilters()}
            className="bg-bg2 px-4 py-2 rounded-full text-sm font-medium border border-white/10 hover:border-vert/50 transition-colors"
          >
            {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
          </button>
          <h1 className="text-titre font-hias tracking-tighter">
            Tous mes <span className="text-vert">albums</span>
          </h1>
        </div>

        {/* Contenu dynamique selon ViewMode */}
        {viewMode === 'list' ? (
          <ListView albums={albums} sortConfig={currentSort} onSort={handleSort} />
        ) : (
          <GridView albums={albums} sortConfig={currentSort} onSort={handleSort} />
        )}

        {/* Pagination */}
        {hasMore && (
          <div className="mt-12 flex justify-center pb-12">
            <button
              onClick={loadMore}
              disabled={loading}
              className="bg-bg2 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 transition-all disabled:opacity-50"
            >
              {loading ? "Chargement..." : "Charger plus d'albums"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// --- SOUS-COMPOSANTS DE VUE ---

function ListView({ albums, sortConfig, onSort }: { albums: Album[], sortConfig: any, onSort: (key: SortKey) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 px-4 mb-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
        <div className="pl-16 cursor-pointer hover:text-white" onClick={() => onSort('name')}>
          Album {sortConfig.sort === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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

      {albums.map((album) => (
        <div key={album.spotify_id} className="group grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg shadow-lg bg-bg2">
              {album.cover ? <Image src={album.cover} alt={album.name} fill sizes="56px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600">?</div>}
            </div>
            <h3 className="font-bold text-base group-hover:text-vert transition-colors truncate">{album.name}</h3>
          </div>
          <div className="text-center text-sm text-gray-200">{Math.round(album.total_minutes)} min</div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-vert">{album.engagement}%</span>
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="bg-vert h-full" style={{ width: `${album.engagement}%` }} />
              </div>
            </div>
          </div>
          <div className="text-center font-hias font-bold text-vert">{album.play_count}</div>
          <div className={`${album.rating >= 1.35 ? 'text-vert' : album.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} text-center font-bold`}>{album.rating}</div>
        </div>
      ))}
    </div>
  );
}

function GridView({ albums, sortConfig, onSort }: { albums: Album[], sortConfig: any, onSort: (key: SortKey) => void }) {
  return (
    <>
      <div className="flex justify-end gap-6 mb-8 text-[10px] uppercase font-bold tracking-widest text-gray-500">
        {(['name', 'total_minutes', 'engagement', 'play_count', 'rating'] as SortKey[]).map(key => (
          <button key={key} onClick={() => onSort(key)} className={`uppercase hover:text-white ${sortConfig.sort === key ? 'text-vert' : ''}`}>
            {key.replace('_', ' ')} {sortConfig.sort === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {albums.map((album) => (
          <div key={album.spotify_id} className="group bg-bg2/30 backdrop-blur-md rounded-3xl border border-white/5 p-4 hover:border-vert/40 transition-all hover:-translate-y-1">
            <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-2xl">
              {album.cover && <Image src={album.cover} alt={album.name} fill sizes="150px" className="object-cover group-hover:scale-105 transition-transform duration-500" />}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                <span className={`${album.rating >= 1.35 ? 'text-vert' : album.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} font-bold text-xs`}>{album.rating}</span>
              </div>
            </div>
            <h3 className="font-bold truncate text-sm mb-1">{album.name}</h3>
            <div className="flex justify-between">
              <p className="text-gray-400 text-xs truncate mb-3">{album.artist}</p>
              <span className="text-xs font-bold text-vert">{album.engagement}%</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <span className="text-[10px] uppercase text-gray-500 font-bold">{album.play_count} streams</span>
              <span className="text-[10px] uppercase text-gray-500 font-bold">{Math.round(album.total_minutes)} min</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}