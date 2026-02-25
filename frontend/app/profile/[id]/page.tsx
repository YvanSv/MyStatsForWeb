"use client";

import { useApi } from "@/app/hooks/useApi";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";

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
  const router = useRouter();
  const { id } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { getProfileData, loading } = useApi();
  const { user: currentUser } = useAuth();

  const isOwner = useMemo(() => {
    if (!currentUser || !id) return false;
    const profileId = Array.isArray(id) ? id[0] : id;
    const currentUserId = currentUser.user?.id || currentUser.id;
    return currentUserId?.toString() === profileId;
  }, [currentUser, id]);

  useEffect(() => {
    const loadData = async () => {
      const profileId = Array.isArray(id) ? id[0] : id;
      if (!profileId) return;

      try {
        const data = await getProfileData(profileId);
        setProfile(data);
      } catch (err) {
        console.error("Échec du chargement du profil", err);
      }
    };

    loadData();
  }, [id, getProfileData]);

  const totalDays = profile ? Math.floor(profile.total_minutes / 1440) : 0;

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div>Profil introuvable</div>;

  return (
    <div className="min-h-screen pb-20">
      {/* --- BANNIÈRE --- */}
      <div className="relative h-[300px] w-full overflow-hidden">
        <img src={profile.banner} className="w-full h-full object-cover opacity-50 grayscale-[20%]" alt="Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg1 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10">
        {/* HEADER PROFIL */}
        <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
          <img src={profile.avatar} className="w-40 h-40 rounded-[35px] border-4 border-bg1 bg-bg2 object-cover" alt="Avatar" />
          <div className="flex-1 mb-4">
            <h1 className="text-[40px] font-semibold text-white leading-none mb-2">{profile.display_name}</h1>
            <p className="text-vert font-hias tracking-[0.2em] text-sm uppercase">Membre Premium</p>
          </div>

           {/* --- ACTIONS --- */}
          <div className="flex gap-3 mb-4">
            {isOwner ? (
              <button 
                onClick={() => router.push(`/profile/${id}/edit`)}
                className="px-8 py-3 bg-vert hover:bg-vert/90 text-bg1 font-semibold rounded-2xl transition-all active:scale-95 flex items-center gap-2"
              >
                <EditIcon size={18} />
                Modifier le profil
              </button>
            ) : (
              <button className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95">
                Suivre l'utilisateur
              </button>
            )}
            <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95">
              <ShareIcon size={20} />
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Minutes d'écoute" value={
            <>
              {profile.total_minutes.toLocaleString()} 
              <span className="text-sm opacity-50 ml-2">({totalDays} jours)</span>
            </>
            } 
            sub="Total cumulé" 
            color="text-vert"
          />
          <StatCard title="Artiste Favori" value={profile.top_artist} sub="Le plus écouté" color="text-blue-400" />
          <StatCard title="Genre Prédilection" value={profile.top_genre} sub="Analyse audio" color="text-purple-400" />
        </div>

        {/* ÉCOUTES RÉCENTES */}
        <div className="bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8">
          <h2 className="text-2xl text-white mb-8">Écoutes récentes</h2>
          <div className="space-y-4">
            {profile.recent_tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-all group">
                <img src={track.image_url} className="w-12 h-12 rounded-lg object-cover" alt={track.title} />
                <div className="flex-1">
                  <p className="text-white font-medium">{track.title}</p>
                  <p className="text-gray-400 text-sm">{track.artist}</p>
                </div>
                <div className="text-gray-500 text-xs">
                    {new Date(track.played_at).toLocaleDateString()}
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

function StatCard({ title, value, sub, color }: { 
  title: string, 
  value: React.ReactNode,
  sub: string, 
  color: string 
}) {
  return (
    <div className="bg-bg2/40 backdrop-blur-md border border-white/5 p-8 rounded-[35px] hover:border-white/10 transition-all group">
      <p className="text-gray-500 font-hias text-[10px] uppercase tracking-[0.2em] mb-4">{title}</p>
      <h3 className={`text-3xl mb-1 ${color}`}>{value}</h3>
      <p className="text-gray-600 text-[11px] italic">{sub}</p>
    </div>
  );
}

const EditIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

const ShareIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
);

function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-20 animate-pulse">
      {/* --- SKELETON BANNIÈRE --- */}
      <div className="relative h-[300px] w-full bg-white/5" />

      {/* --- CONTENU PRINCIPAL --- */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10">
        
        {/* SKELETON HEADER PROFIL */}
        <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
          <div className="w-40 h-40 rounded-[35px] bg-white/10 border-4 border-bg1" />
          <div className="flex-1 mb-4 space-y-3">
            <div className="h-10 w-64 bg-white/10 rounded-xl" />
            <div className="h-4 w-32 bg-vert/20 rounded-md" />
          </div>
          <div className="mb-4 h-12 w-44 bg-white/5 rounded-2xl" />
        </div>

        {/* SKELETON GRILLE DE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg2/40 border border-white/5 p-8 rounded-[35px] h-40">
              <div className="h-3 w-20 bg-white/10 rounded mb-6" />
              <div className="h-8 w-32 bg-white/20 rounded mb-3" />
              <div className="h-3 w-24 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* SKELETON SECTION RÉCENTE */}
        <div className="bg-bg2/30 border border-white/5 rounded-[40px] p-8 md:p-12">
          <div className="h-8 w-48 bg-white/10 rounded mb-8" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-white/10 rounded" />
                  <div className="h-3 w-1/4 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}