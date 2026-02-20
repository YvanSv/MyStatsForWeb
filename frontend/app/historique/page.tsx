"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Track {
  spotify_id: string;
  played_at: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
}

export default function HistoryPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [history, setHistory] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

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
    const fetchHistory = async (currentOffset: number) => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/spotify/recently-played?offset=${currentOffset}&limit=50`, {credentials: "include"});
        if (response.ok) {
          const newData = await response.json();
          setHistory(prev => (currentOffset === 0 ? newData : [...prev, ...newData]));
        }
      } catch (error) {console.error("Erreur historique:", error);}
      finally {setLoading(false);}
    };
    fetchHistory(0);
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
              > {showFilters ? "Masquer les filtres" : "Afficher les filtres"} </button>
              <h1 className="text-titre font-hias tracking-tighter">Historique <span className="text-vert">récent</span></h1>
              <p></p>
              <p></p>
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
                      <p className="text-gray-400 text-sm">{track.artist} • <span className="italic">{track.album}</span></p>
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

// Petit composant interne pour les groupes de filtres dépliables
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