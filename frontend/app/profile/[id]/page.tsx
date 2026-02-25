"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PROFILE_STYLES } from "@/app/styles/profile";
import { useAuth } from "@/app/hooks/useAuth";
import { useProfile } from "@/app/hooks/useProfile";

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
  // const router = useRouter();
  const { id } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { getProfile, loading } = useProfile();
  const { user: currentUser } = useAuth();

  const isOwner = useMemo(() => {
    if (!currentUser || !id) return false;
    const profileId = Array.isArray(id) ? id[0] : id;
    return currentUser.id?.toString() === profileId;
  }, [currentUser, id]);

  useEffect(() => {
    const loadData = async () => {
      const profileId = Array.isArray(id) ? id[0] : id;
      if (!profileId) return;

      try {
        const data = await getProfile(profileId);
        setProfile(data);
      } catch (err) {console.error("Échec du chargement du profil", err)}
    };

    loadData();
  }, []);

  const totalDays = profile ? Math.floor(profile.total_minutes / 1440) : 0;

  if (!profile)
    if (loading) return <ProfileSkeleton />;
    else return <div className="text-center mt-20 text-white">Profil introuvable</div>;

  return (
    <div className={PROFILE_STYLES.MAIN_WRAPPER}>
      {/* --- BANNIÈRE --- */}
      <div className={PROFILE_STYLES.BANNER_WRAPPER}>
        <img src={profile.banner} className={PROFILE_STYLES.BANNER_IMG} alt="Banner" />
        <div className={PROFILE_STYLES.GRADIENT_OVERLAY} />
      </div>

      <div className={PROFILE_STYLES.CONTAINER}>
        {/* HEADER PROFIL */}
        <div className={PROFILE_STYLES.HEADER_FLEX}>
          <img src={profile.avatar} className={PROFILE_STYLES.AVATAR} alt="Avatar" />
          
          <div className={PROFILE_STYLES.INFO_BLOCK}>
            <h1 className={PROFILE_STYLES.NAME}>{profile.display_name}</h1>
            <p className={PROFILE_STYLES.BADGE}>Membre Premium</p>
          </div>

          {/* --- ACTIONS --- */}
          <div className={PROFILE_STYLES.ACTION_GROUP}>
            {isOwner ? (
              <button className={PROFILE_STYLES.BTN_EDIT}>
                <EditIcon size={18} />
                Modifier le profil
              </button>
            ) : (
              <button className={PROFILE_STYLES.BTN_FOLLOW}>
                Suivre l'utilisateur
              </button>
            )}
            <button className={PROFILE_STYLES.BTN_SHARE}>
              <ShareIcon size={20} />
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className={PROFILE_STYLES.STATS_GRID}>
          <StatCard 
            title="Minutes d'écoute" 
            value={<>{profile.total_minutes.toLocaleString()} <span className="text-sm opacity-50 ml-2">({totalDays} j)</span></>} 
            sub="Total cumulé" 
            color="text-vert"
          />
          <StatCard title="Artiste Favori" value={profile.top_artist} sub="Le plus écouté" color="text-blue-400" />
          <StatCard title="Genre de prédilection" value={profile.top_genre} sub="Analyse audio" color="text-purple-400" />
        </div>

        {/* ÉCOUTES RÉCENTES */}
        <div className={PROFILE_STYLES.RECENT_CONTAINER}>
          <h2 className={PROFILE_STYLES.SECTION_TITLE}>Écoutes récentes</h2>
          <div className="space-y-4">
            {profile.recent_tracks.map((track) => (
              <div key={track.id} className={PROFILE_STYLES.TRACK_ITEM}>
                <img src={track.image_url} className={PROFILE_STYLES.TRACK_IMG} alt={track.title} />
                <div className="flex-1">
                  <p className={PROFILE_STYLES.TRACK_NAME}>{track.title}</p>
                  <p className={PROFILE_STYLES.TRACK_ARTIST}>{track.artist}</p>
                </div>
                <div className={PROFILE_STYLES.TRACK_DATE}>
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
    <div className="bg-bg2/40 backdrop-blur-md border border-white/5 p-8 rounded-[35px] hover:border-white/10 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -mr-12 -mt-12 group-hover:bg-vert/5 transition-colors" />
      <p className="text-gray-500 font-hias text-[10px] uppercase tracking-[0.2em] mb-4 relative z-10">{title}</p>
      <h3 className={`text-3xl font-bold mb-1 relative z-10 ${color}`}>{value}</h3>
      <p className="text-gray-600 text-[11px] italic relative z-10">{sub}</p>
    </div>
  );
}

const EditIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const ShareIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>

function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-20 animate-pulse">
      <div className="relative h-[300px] w-full bg-white/5" />
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10">
        <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
          <div className="w-40 h-40 rounded-[35px] bg-white/10 border-4 border-bg1" />
          <div className="flex-1 mb-4 space-y-3">
            <div className="h-10 w-64 bg-white/10 rounded-xl" />
            <div className="h-4 w-32 bg-vert/20 rounded-md" />
          </div>
          <div className="mb-4 h-12 w-44 bg-white/5 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}