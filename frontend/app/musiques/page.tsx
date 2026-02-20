"use client";

import { useEffect, useState } from "react";
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
  rating: number;
}

export default function MusiquesPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [musics, setMusics] = useState<Track[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const { getMusics } = useApi();

  const fetchMusics = async (currentOffset: number) => {
    try {
      const newData = await getMusics(currentOffset);
      if (newData.length < 50) setHasMore(false);
      setMusics(prev => (currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) {}
  };

  useEffect(() => { fetchMusics(0); setLoading(false); }, []);

  const loadMore = () => {
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    fetchMusics(nextOffset);
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
          
          {/* --- SIDEBAR FILTRES --- */}
          <aside className={`transition-all duration-300 ${showFilters ? 'w-full md:w-64' : 'w-0 overflow-hidden opacity-0 invisible md:w-0'}`}>
            <div className="sticky top-24 bg-bg2/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
              <h2 className="text-xl font-hias mb-6 text-vert">Filtres</h2>
              <div className="space-y-6">
                <FilterGroup title="Période">
                  <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"><input type="checkbox" className="accent-vert"/> Aujourd'hui</label>
                  <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"><input type="checkbox" className="accent-vert"/> 7 derniers jours</label>
                </FilterGroup>
                <FilterGroup title="Genre">
                  <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"><input type="checkbox" className="accent-vert"/> Synthwave</label>
                  <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"><input type="checkbox" className="accent-vert"/> Pop</label>
                </FilterGroup>
              </div>
            </div>
          </aside>

          {/* --- LISTE DES ÉLÉMENTS --- */}
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

            {/* --- EN-TÊTE FIXE --- */}
            <div className="grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 px-4 mb-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <div className="pl-16">Titre / Artiste</div> {/* On décale pour aligner avec le texte après l'image */}
              <div className="hidden lg:block text-center">Temps total</div>
              <div className="hidden md:block text-center">Engagement</div>
              <div className="text-center">Streams</div>
              <div className="text-center">Rating</div>
              <div></div> {/* Colonne vide pour le bouton play */}
            </div>

            <div className="space-y-4">
              {musics.map((track) => (
                <div key={track.spotify_id} className="group grid grid-cols-[2fr_120px_140px_100px_80px_60px] items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
                  {/* Image & Titre (Identique) */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg shadow-lg bg-bg2">
                      {track.cover && <Image src={track.cover} alt={track.title} fill sizes="56px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base leading-tight group-hover:text-vert transition-colors truncate">{track.title}</h3>
                      <p className="text-gray-400 text-xs truncate">{track.artist} • <span className="italic">{track.album}</span></p>
                    </div>
                  </div>

                  {/* Temps d'écoute total */}
                  <div className="hidden lg:flex flex-col items-center w-28 shrink-0">
                    <p className="font-medium text-sm text-gray-200">~{Math.round(track.total_minutes)} min</p>
                  </div>

                  {/* Écoutes Complètes vs Skips */}
                  <div className="hidden md:flex flex-col items-center w-32 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-vert font-medium">{Math.round(Math.min(track.total_minutes*60000,track.duration_ms * track.play_count) / (track.duration_ms * track.play_count) * 100)}%</span>
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="bg-vert h-full" style={{ width: `${Math.round(Math.min(track.total_minutes*60000,track.duration_ms * track.play_count) / (track.duration_ms * track.play_count) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Nombre d'écoutes total (Mis en avant) */}
                  <div className="flex flex-col items-center w-24 shrink-0">
                    <p className="text-lg font-hias font-bold text-vert">{track.play_count}</p>
                  </div>

                  {/* Rating */}
                  <div className="flex flex-col items-center w-20 shrink-0">
                    <div className="flex items-center gap-1 text-vert">
                      <span className="font-bold">{track.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* --- BOUTON CHARGER PLUS --- */}
            {hasMore && (
              <div className="mt-12 flex justify-center pb-12">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="group relative flex items-center gap-3 bg-bg2/50 border border-white/10 px-8 py-4 rounded-full font-bold hover:border-vert/50 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-vert border-t-transparent animate-spin rounded-full"></div>
                  ) : ( "Charger plus d'écoutes" )}
                  <span className="text-vert group-hover:translate-y-1 transition-transform">↓</span>
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
      {isOpen && <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-300">{children}</div>}
    </div>
  );
}