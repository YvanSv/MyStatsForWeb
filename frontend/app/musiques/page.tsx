"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useApi } from "../hooks/useApi";

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

export default function MusiquesPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [musics, setMusics] = useState<Track[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { getMusics } = useApi();
  type SortKey = 'title' | 'total_minutes' | 'engagement' | 'play_count' | 'rating';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'play_count',
    direction: 'desc'
  });

  const fetchMusics = useCallback(async (
    currentOffset: number, 
    isNewSort: boolean, 
    currentSort: { key: SortKey; direction: 'asc' | 'desc' }
  ) => {
    setLoading(true); 
    try {
      const newData = await getMusics({
        offset: currentOffset,
        limit: 50,
        sort_by: currentSort.key === 'title' ? 'name' : currentSort.key,
        direction: currentSort.direction
      });

      if (newData.length < 50) setHasMore(false);
      else setHasMore(true);

      setMusics(prev => (isNewSort || currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) { 
      console.error("Erreur lors de la récupération :", err); 
    } finally { 
      setLoading(false); 
    }
  }, [getMusics]);

  // 2. L'effet de changement de tri
  useEffect(() => {
    setOffset(0);
    fetchMusics(0, true, sortConfig);
  }, [sortConfig, fetchMusics]);

  // 3. Le bouton charger plus
  const loadMore = () => {
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    fetchMusics(nextOffset, false, sortConfig);
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
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]"></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-12 px-6">
        <div className="flex flex-col md:flex-row gap-8">
          
          <aside className={`transition-all duration-300 ${showFilters ? 'w-full md:w-64' : 'w-0 overflow-hidden opacity-0 invisible md:w-0'}`}>
            <div className="sticky top-24 bg-bg2/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
              <h2 className="text-xl font-hias mb-6 text-vert">Filtres</h2>
              <div className="space-y-6">
                <FilterGroup title="Période">
                   <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"><input type="checkbox" className="accent-vert"/> Aujourd'hui</label>
                   <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"><input type="checkbox" className="accent-vert"/> 7 derniers jours</label>
                </FilterGroup>
              </div>
            </div>
          </aside>

          <section className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowFilters(!showFilters)}
                className="bg-bg2 px-4 py-2 rounded-full text-sm font-medium border border-white/10 cursor-pointer hover:border-vert/50 transition-colors"
              > 
                {showFilters ? "Masquer les filtres" : "Afficher les filtres"} 
              </button>
              <h1 className="text-titre font-hias tracking-tighter text-right">Toutes mes <span className="text-vert">musiques</span></h1>
              <p/><p/>
            </div>

            <div className="grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 px-4 mb-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <div className="pl-16"><button onClick={() => handleSort('title')} className="uppercase cursor-pointer hover:text-white">Titre {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button></div>
              <div className="hidden lg:block text-center"><button onClick={() => handleSort('total_minutes')} className="uppercase cursor-pointer hover:text-white">Temps {sortConfig.key === 'total_minutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button></div>
              <div className="hidden md:block text-center"><button onClick={() => handleSort('engagement')} className="uppercase cursor-pointer hover:text-white">Engagement {sortConfig.key === 'engagement' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button></div>
              <div className="text-center"><button onClick={() => handleSort('play_count')} className="uppercase cursor-pointer hover:text-white">Streams {sortConfig.key === 'play_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button></div>
              <div className="text-center"><button onClick={() => handleSort('rating')} className="uppercase cursor-pointer hover:text-white">Rating {sortConfig.key === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button></div>
            </div>

            <div className="space-y-4">
              {musics.map((track) => (
                <div key={track.spotify_id} className="group grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg shadow-lg bg-bg2">
                      {track.cover && <Image src={track.cover} alt={track.title} fill sizes="56px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base leading-tight group-hover:text-vert transition-colors truncate">{track.title}</h3>
                      <p className="text-gray-400 text-xs truncate">{track.artist} • <span className="italic">{track.album}</span></p>
                    </div>
                  </div>

                  <div className="hidden lg:flex flex-col items-center">
                    <p className="font-medium text-sm text-gray-200">{Math.round(track.total_minutes)} min</p>
                  </div>

                  <div className="hidden md:flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-vert font-medium">{track.engagement}%</span>
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="bg-vert h-full" style={{ width: `${track.engagement}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <p className="text-lg font-hias font-bold text-vert">{track.play_count}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="font-bold text-vert">{track.rating}</span>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center pb-12">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-bg2/50 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 transition-all"
                >
                  {loading ? "Chargement..." : "Charger plus"}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function FilterGroup({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center mb-3 font-bold text-sm tracking-widest uppercase opacity-70">
        {title} <span>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}