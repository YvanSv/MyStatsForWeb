"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useApi } from "../hooks/useApi";
import { useViewMode } from "../context/viewModeContext";
import SidebarFilters from "../components/SidebarFilters";
import { useShowFilters } from "../context/showFiltersContext";
import { useSearchParams } from "next/navigation";

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
  const { getArtists } = useApi();
  const [artists, setArtists] = useState<Artist[]>([]);
  const { showFilters, toggleShowFilters } = useShowFilters();
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'play_count',
    direction: 'desc'
  });

  const currentSort = useMemo(() => ({
    key: (searchParams.get("sort") as SortKey) || "play_count",
    direction: (searchParams.get("dir") as "asc" | "desc") || "desc",
    period: searchParams.get("period") || "all",
    artist: searchParams.get("artist") || "",
    streams_min: searchParams.get("streams_min") || "0",
    streams_max: searchParams.get("streams_max") || "2000",
    minutes_min: searchParams.get("minutes_min") || "0",
    minutes_max: searchParams.get("minutes_max") || "5000",
    engagement_min: searchParams.get("engagement_min") || "0",
    engagement_max: searchParams.get("engagement_max") || "100",
    rating_min: searchParams.get("rating_min") || "0",
    rating_max: searchParams.get("rating_max") || "10",
  }), [searchParams]);

  const artistFilters = {
    search: { artist: true },
    stats: {
      streams: { min: 0, max: 20000 },
      minutes: { min: 0, max: 50000 },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: 10 }
    }
  };

  const fetchArtistsData = useCallback(async (currentOffset: number, isNewRequest: boolean = false) => {
    setLoading(true);
    try {
      const newData = await getArtists({
        offset: currentOffset,
        limit: 50,
        sort_by: sortConfig.key,
        ...currentSort
      });

      setHasMore(newData.length === 50);
      setArtists(prev => (isNewRequest ? newData : [...prev, ...newData]));
    } catch (err) { console.error("Erreur fetch artists:", err); }
    finally { setLoading(false); }
  }, [getArtists, currentSort]);

  useEffect(() => {
    setOffset(0);
    fetchArtistsData(0, true);
  }, [sortConfig, fetchArtistsData]);

  const loadMore = () => {
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    fetchArtistsData(nextOffset);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <main className="min-h-screen text-white font-jost relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]" />
      </div>

      <div className="max-w-[1400px] mx-auto py-12 px-6">
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
              <ListView artists={artists} sortConfig={sortConfig} onSort={handleSort} />
            ) : (
              <GridView artists={artists} sortConfig={sortConfig} onSort={handleSort} />
            )}

            {/* Pagination */}
            {hasMore && (
              <div className="mt-12 flex justify-center pb-12">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-bg2 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 transition-all disabled:opacity-50"
                >
                  {loading ? "Chargement..." : "Charger plus d'artistes"}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// --- SOUS-COMPOSANTS DE VUE ---

function ListView({ artists, sortConfig, onSort }: { artists: Artist[], sortConfig: any, onSort: (key: SortKey) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 px-4 mb-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
        <div className="pl-16 cursor-pointer hover:text-white" onClick={() => onSort('name')}>
          Artiste {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('total_minutes')}>
          Temps {sortConfig.key === 'total_minutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('engagement')}>
          Engagement {sortConfig.key === 'engagement' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('play_count')}>
          Streams {sortConfig.key === 'play_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
        <div className="text-center cursor-pointer hover:text-white" onClick={() => onSort('rating')}>
          Rating {sortConfig.key === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
      </div>

      {artists.map((artist) => (
        <div key={artist.id} className="group grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full shadow-lg bg-bg2 border border-white/10">
              {artist.image_url ? <Image src={artist.image_url} alt={artist.name} fill sizes="56px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600">?</div>}
            </div>
            <h3 className="font-bold text-base group-hover:text-vert transition-colors truncate">{artist.name}</h3>
          </div>
          <div className="text-center text-sm text-gray-200">{Math.round(artist.total_minutes)} min</div>
          <div className="text-center text-xs text-vert">{artist.engagement}%</div>
          <div className="text-center font-hias font-bold text-vert">{artist.play_count}</div>
          <div className={`${artist.rating > 2 ? 'text-vert' : artist.rating > 1 ? 'text-jaune' : 'text-rouge'} text-center font-bold`}>{artist.rating}</div>
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
          <button key={key} onClick={() => onSort(key)} className={`uppercase hover:text-white transition-colors ${sortConfig.key === key ? 'text-vert' : ''}`}>
            {key === 'name' ? 'Nom' : key.replace('_', ' ')} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {artists.map((artist) => (
          <div key={artist.id} className="group flex flex-col items-center bg-bg2/20 p-6 rounded-[2.5rem] border border-white/5 hover:border-vert/30 transition-all hover:-translate-y-2">
            <div className="relative aspect-square w-full mb-4 overflow-hidden rounded-full shadow-2xl border-4 border-transparent group-hover:border-vert/20 transition-all duration-500">
              {artist.image_url ? (
                <Image src={artist.image_url} alt={artist.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full bg-bg2 flex items-center justify-center text-gray-700">?</div>
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>
            <h3 className="font-bold text-center text-base truncate w-full group-hover:text-vert transition-colors mb-1">{artist.name}</h3>
            <span className={`${artist.rating > 2 ? 'text-vert' : artist.rating > 1 ? 'text-jaune' : 'text-rouge'} text-[10px] font-bold tracking-tighter`}>{artist.rating} ★</span>
            <div className="flex gap-3 mt-2">
                <span className="text-[11px] uppercase text-gray-500 font-black">{artist.play_count} streams</span>
                <span className="text-[11px] font-bold text-vert">{artist.engagement}%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}