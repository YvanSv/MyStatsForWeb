"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

interface UserProfile {
  display_name: string;
  avatar: string;
  banner: string;
  total_minutes: number;
  top_artist: string;
  top_genre: string;
  recent_tracks: any[];
}

export default function ProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile({
      display_name: "Utilisateur Spotify",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      banner: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070",
      total_minutes: 12450,
      top_artist: "The Weeknd",
      top_genre: "Synthwave",
      recent_tracks: [1, 2, 3]
    });
  }, [id]);

  if (!profile) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* --- BANNIÈRE --- */}
      <div className="relative h-[300px] w-full overflow-hidden">
        <img 
          src={profile.banner} 
          className="w-full h-full object-cover opacity-50 grayscale-[20%]" 
          alt="Banner"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg1 to-transparent" />
      </div>

      {/* --- CONTENU PRINCIPAL --- */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10">
        
        {/* HEADER PROFIL */}
        <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-vert to-blue-500 rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <img 
              src={profile.avatar} 
              className="relative w-40 h-40 rounded-[35px] border-4 border-bg1 bg-bg2 object-cover"
              alt="Avatar"
            />
          </div>
          <div className="flex-1 mb-4">
            <h1 className="text-s-titre font-jost text-white leading-none mb-2">{profile.display_name}</h1>
            <p className="text-vert font-hias tracking-[0.2em] text-sm uppercase">Membre Premium</p>
          </div>
          <button className="mb-4 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl text-white font-jost transition-all active:scale-95">
            Partager le profil
          </button>
        </div>

        {/* GRILLE DE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Minutes d'écoute" value={profile.total_minutes.toLocaleString()} sub="Total 2024" color="text-vert" />
          <StatCard title="Artiste Favori" value={profile.top_artist} sub="Basé sur 30 jours" color="text-blue-400" />
          <StatCard title="Genre Prédilection" value={profile.top_genre} sub="Analyse audio" color="text-purple-400" />
        </div>

        {/* SECTION RÉCENTE */}
        <div className="bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 md:p-12">
          <h2 className="text-2xl font-jost text-white mb-8">Écoutes récentes</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5 group">
                <div className="w-12 h-12 bg-white/10 rounded-lg overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="h-4 w-40 bg-white/10 rounded mb-2" />
                  <div className="h-3 w-24 bg-white/5 rounded" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <PlayIcon size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- SOUS-COMPOSANTS --- */

function StatCard({ title, value, sub, color }: { title: string, value: string, sub: string, color: string }) {
  return (
    <div className="bg-bg2/40 backdrop-blur-md border border-white/5 p-8 rounded-[35px] hover:border-white/10 transition-all group">
      <p className="text-gray-500 font-hias text-[10px] uppercase tracking-[0.2em] mb-4">{title}</p>
      <h3 className={`text-3xl font-jost mb-1 ${color}`}>{value}</h3>
      <p className="text-gray-600 text-[11px] font-jost italic">{sub}</p>
    </div>
  );
}

const PlayIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-vert"><path d="M8 5v14l11-7z"/></svg>
);