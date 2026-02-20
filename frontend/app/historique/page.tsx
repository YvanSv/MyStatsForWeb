"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useApi } from "../hooks/useApi";

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

  // Fonction pour formater la date (ex: 2023-10-27T10:00 -> 27/10 à 10:00)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const fetchMusics = async (currentOffset: number) => {
      try {
        const newData = await getHistory(currentOffset);
        setHistory(prev => (currentOffset === 0 ? newData : [...prev, ...newData]));
      } catch (err) {}
    };
    fetchMusics(0);
    setLoading(false);
  }, []);

  return (
    <main className="min-h-screen text-white font-jost relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]"></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* --- LISTE DES ÉLÉMENTS --- */}
          <section className="flex-1">
            <div className="flex items-center justify-center mb-8">
              <h1 className="text-titre font-hias tracking-tighter">Historique <span className="text-vert">récent</span></h1>
            </div>

            {loading ? (
              <header className="h-20 bg-background"/>
            ):(
              <div className="space-y-4">
                {history.map((track) => (
                  <div key={`${track.spotify_id}-${track.played_at}`} className="group flex items-center gap-4 bg-bg2/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg shadow-lg">
                      <Image src={track.cover} alt={track.title} fill sizes="64px" className="object-cover" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-vert transition-colors">{track.title}</h3>
                      <p className="text-gray-400 text-sm">{track.artist_name} • <span className="italic">{track.album_name}</span></p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatDate(track.played_at)}</p>
                      <button className="mt-2 text-vert opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">Réécouter</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}