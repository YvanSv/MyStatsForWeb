"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useApi } from "../hooks/useApi";
import { useViewMode } from "../context/viewModeContext";

interface Track {
  spotify_id: string;
  played_at: string;
  title: string;
  artist_name: string;
  album_name: string;
  cover: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { getHistory } = useApi();
  
  // On récupère le viewMode global (partagé avec le Header)
  const { viewMode } = useViewMode();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchHistory = useCallback(async (currentOffset: number) => {
    setLoading(true);
    try {
      const newData = await getHistory(currentOffset);
      setHistory(prev => (currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getHistory]);

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  return (
    <main className="min-h-screen text-white font-jost relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]"></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-12 px-6">
        <div className="flex flex-col gap-8">
          <section className="flex-1">
            <div className="flex items-center justify-between mb-12">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">
                {history.length} titres récupérés
              </p>
              <h1 className="text-titre font-hias tracking-tighter">
                Historique <span className="text-vert">récent</span>
              </h1>
            </div>

            {loading && history.length === 0 ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 border-2 border-vert border-t-transparent animate-spin rounded-full"></div>
              </div>
            ) : (
              /* --- SWITCH D'AFFICHAGE --- */
              <div className={
                viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" 
                : "space-y-4"
              }>
                {history.map((track) => (
                  viewMode === 'list' ? (
                    /* --- MODE LIGNE --- */
                    <div key={`${track.spotify_id}-${track.played_at}`} className="group flex items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg shadow-lg">
                        <Image src={track.cover || "/logo.png"} alt={track.title} fill sizes="64px" className="object-cover" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-tight group-hover:text-vert transition-colors truncate">{track.title}</h3>
                        <p className="text-gray-400 text-sm truncate">{track.artist_name} • <span className="italic">{track.album_name}</span></p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{formatDate(track.played_at)}</p>
                        <button className="mt-2 text-vert opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase tracking-tighter">Réécouter</button>
                      </div>
                    </div>
                  ) : (
                    /* --- MODE CASES (GRID) --- */
                    <div key={`${track.spotify_id}-${track.played_at}`} className="group bg-bg2/20 backdrop-blur-md p-4 rounded-[2rem] border border-white/5 hover:border-vert/30 transition-all hover:-translate-y-1">
                      <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-xl">
                        <Image src={track.cover || "/logo.png"} alt={track.title} fill sizes="(max-width: 768px) 50vw, 20vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                           <p className="text-[9px] text-vert font-bold">{formatDate(track.played_at)}</p>
                        </div>
                      </div>
                      <div className="px-2 min-w-0">
                        <h3 className="font-bold text-sm leading-tight truncate group-hover:text-vert transition-colors">{track.title}</h3>
                        <p className="text-gray-500 text-[11px] truncate mt-1">{track.artist_name}</p>
                        <p className="text-gray-600 text-[10px] italic truncate">{formatDate(track.played_at)}</p>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}