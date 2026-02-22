"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useApi } from "../hooks/useApi";
import { useViewMode } from "../context/viewModeContext";
import SidebarFilters from "../components/SidebarFilters";
import { useShowFilters } from "../context/showFiltersContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Artist {
  id: string;
  name: string;
  image_url: string;
  play_count: number;
  total_minutes: number;
  rating: number;
  engagement: number;
}

type SortKey = 'name' | 'total_minutes' | 'engagement' | 'play_count' | 'rating';

export default function ArtistesContent() {
  const searchParams = useSearchParams();
  const { viewMode } = useViewMode();
  const { getArtists, getArtistsMetadata } = useApi();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [metadata, setMetadata] = useState({ max_streams: 99999999, max_minutes: 99999999, max_rating: 5 });
  const { showFilters, toggleShowFilters } = useShowFilters();
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = useMemo(() => ({
    sort: (searchParams.get("sort") as SortKey) || "play_count",
    direction: (searchParams.get("direction") as "asc" | "desc") || "desc",
    artist: searchParams.get("artist") || "",
    streams_min: searchParams.get("streams_min") || "0",
    streams_max: searchParams.get("streams_max") || "99999999",
    minutes_min: searchParams.get("minutes_min") || "0",
    minutes_max: searchParams.get("minutes_max") || "99999999",
    engagement_min: searchParams.get("engagement_min") || "0",
    engagement_max: searchParams.get("engagement_max") || "100",
    rating_min: searchParams.get("rating_min") || "0",
    rating_max: searchParams.get("rating_max") || "10",
  }), [searchParams]);

  const artistFilters = {
    search: { artist: true },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    }
  };

  const fetchArtists = useCallback(async (currentOffset: number, isNewSort: boolean = false) => {
    setLoading(true);
    try {
      const newData = await getArtists({
        offset: currentOffset,
        limit: 50,
        ...currentSort
      });
      setHasMore(newData.length === 50);
      setArtists(prev => (isNewSort || currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [getArtists, currentSort]);
  
  useEffect(() => {
    getArtistsMetadata().then(setMetadata);
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchArtists(0, true);
  }, [searchParams, fetchArtists]);

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
    fetchArtists(nextOffset);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <SidebarFilters config={artistFilters} loading={loading} isVisible={showFilters}/>

      <section className="flex-1">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => toggleShowFilters()}
            className="bg-bg2 px-4 py-2 rounded-full text-sm font-medium border border-white/10 cursor-pointer hover:border-vert/50 transition-colors"
          >{showFilters ? "Masquer les filtres" : "Afficher les filtres"}</button>
          <h1 className="text-titre font-hias tracking-tighter text-right">Tous mes <span className="text-vert">artistes</span></h1>
        </div>

        {/* Switch de Vue */}
        {viewMode === 'list' ? (
          <ListView artists={artists} sortConfig={currentSort} onSort={handleSort} />
        ) : (
          <GridView artists={artists} sortConfig={currentSort} onSort={handleSort} />
        )}

        {/* Pagination */}
        {hasMore && (
          <div className="mt-12 flex justify-center pb-12">
            <button
              onClick={loadMore}
              disabled={loading}
              className="bg-bg2 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 transition-all disabled:opacity-50"
            >{loading ? "Chargement..." : "Charger plus d'artistes"}</button>
          </div>
        )}
      </section>
    </div>
  );
}

// --- SOUS-COMPOSANTS DE VUE ---

function ListView({ artists, sortConfig, onSort }: { artists: Artist[], sortConfig: any, onSort: (key: SortKey) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[50px_2fr_120px_140px_100px_80px_60px] items-center gap-4 px-4 mb-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
        <div/>
        <div className={`pl-16 cursor-pointer hover:text-white ${sortConfig.sort !== 'name' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('name')}>
          Artiste {sortConfig.sort === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'total_minutes' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('total_minutes')}>
          Temps {sortConfig.sort === 'total_minutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'engagement' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('engagement')}>
          Engagement {sortConfig.sort === 'engagement' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'play_count' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('play_count')}>
          Streams {sortConfig.sort === 'play_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className={`text-center cursor-pointer hover:text-white ${sortConfig.sort !== 'rating' ? 'text-gray-500' : 'text-vert'}`} onClick={() => onSort('rating')}>
          Rating {sortConfig.sort === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
      </div>

      {artists.map((artist,i) => (
        <div key={artist.id} className="group grid grid-cols-[40px_2fr_120px_140px_100px_80px_60px] items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
          <div className="text-gray-500 font-mono text-lg font-medium">
            #{i + 1}
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full shadow-lg bg-bg2 border border-white/10">
              {artist.image_url ? <Image src={artist.image_url} alt={artist.name} fill sizes="56px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600">?</div>}
            </div>
            <h3 className="font-bold text-base group-hover:text-vert transition-colors truncate">{artist.name}</h3>
          </div>
          <div className={`text-center text-sm ${sortConfig.sort !== 'total_minutes' ? 'text-gray-300' : 'text-vert'}`}>{Math.round(artist.total_minutes)} min</div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${sortConfig.sort !== 'engagement' ? 'text-gray-300' : 'text-vert'}`}>{artist.engagement}%</span>
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${sortConfig.sort !== 'engagement' ? 'bg-gray-300' : 'bg-vert'}`} style={{ width: `${artist.engagement}%` }} />
              </div>
            </div>
          </div>
          <div className={`text-center font-hias font-bold ${sortConfig.sort !== 'play_count' ? 'text-gray-300' : 'text-vert'}`}>{artist.play_count}</div>
          <div className={`${artist.rating >= 1.35 ? 'text-vert' : artist.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} text-center font-bold`}>{artist.rating}</div>
        </div>
      ))}
    </div>
  );
}

function GridView({ artists, sortConfig, onSort }: { artists: Artist[], sortConfig: any, onSort: (key: SortKey) => void }) {
  return (
    <>
      <div className="flex justify-end gap-6 mb-8 text-[10px] uppercase font-bold tracking-widest text-gray-500">
        {(['name', 'total_minutes', 'engagement', 'play_count', 'rating'] as SortKey[]).map(key => (
          <button key={key} onClick={() => onSort(key)} className={`uppercase hover:text-white transition-colors ${sortConfig.sort === key ? 'text-vert' : ''}`}>
            {key === 'name' ? 'Nom' : key.replace('_', ' ')} {sortConfig.sort === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {artists.map((artist) => (
          <div key={artist.id} className="group flex flex-col items-center bg-bg2/20 p-6 rounded-[2.5rem] border border-white/5 hover:border-vert/30 transition-all hover:-translate-y-2">
            <div className="relative aspect-square w-full mb-4 overflow-hidden rounded-full shadow-2xl border-4 border-transparent group-hover:border-vert/20 transition-all duration-500">
              {artist.image_url ? (
                <Image src={artist.image_url} alt={artist.name} fill sizes="120px" className="object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full bg-bg2 flex items-center justify-center text-gray-700">?</div>
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>
            <h3 className="font-bold text-center text-base truncate w-full group-hover:text-vert transition-colors mb-1">{artist.name}</h3>
            <span className={`${artist.rating >= 1.35 ? 'text-vert' : artist.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} text-[10px] font-bold tracking-tighter`}>{artist.rating} ★</span>
            <div className="flex gap-3 mt-2">
                <span className={`text-[10px] uppercase font-bold ${sortConfig.sort !== 'play_count' ? 'text-gray-500' : 'text-vert'}`}>{artist.play_count} streams</span>
                <span className={`text-[10px] uppercase font-bold ${sortConfig.sort !== 'engagement' ? 'text-gray-500' : 'text-vert'}`}>{artist.engagement}%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}