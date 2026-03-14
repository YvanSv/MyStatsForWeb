"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useProfile } from "@/app/hooks/useProfile";
import { BarChart3 } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/app/components/Atomic/Buttons";
import { UserProfile } from "@/app/data/DataInfos";
import { AvatarContainer } from "@/app/components/Atomic/Profile/Profile";
import toast from "react-hot-toast";
import { GENERAL_STYLES } from "@/app/styles/general";
import { FRONT_ROUTES } from "@/app/constants/routes";

const PROFILE_STYLES = {
  MAIN_WRAPPER: "min-h-screen pb-20 bg-bg1",
  
  // BANNER
  BANNER_WRAPPER: "relative h-[300px] w-full overflow-hidden",
  BANNER_IMG: "w-full h-full object-cover opacity-50 grayscale-[20%]",
  GRADIENT_OVERLAY: "absolute inset-0 bg-gradient-to-t from-bg1 via-bg1/20 to-transparent",

  // CONTAINER & HEADER
  CONTAINER: "max-w-7xl mx-auto px-6 -mt-24 relative z-10",
  HEADER_FLEX: "profile-header",
  INFO_BLOCK: "info-block-profile",
  NAME: `username-profile`,
  BADGE: `badge-profile`,

  // ACTIONS
  ACTION_GROUP: "flex gap-3 mb-4",

  // GRIDS & CARDS
  STATS_GRID: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full mb-4",
  RECENT_CONTAINER: "bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8",
  SECTION_TITLE: `text2 text-2xl mb-8 font-semibold`,

  // TRACK ITEMS
  TRACK_ITEM: "flex items-center gap-4 p-2 rounded-2xl hover:bg-white/[0.03] transition-all group",
  TRACK_IMG: "w-12 h-12 rounded-lg object-cover shadow-lg",
  TRACK_NAME: `text1 ${GENERAL_STYLES.TRANSITION_TEXT_VERT} font-medium`,
  TRACK_ARTIST: `text3 text-sm`,
  TRACK_DATE: `text3 text-xs font-mono`
};

export default function ProfilePage({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { getProfile } = useProfile();
  const { user: currentUser } = useAuth();

  const isOwner = useMemo(() => {
    if (!currentUser || !id) return false;
    return currentUser.id?.toString() === id;
  }, [currentUser, id]);

  useEffect(() => {
    if (!id || id === 'undefined') return;
    setLoading(true);
    const loadData = async () => {
      try {setProfile(await getProfile(id))}
      finally {setLoading(false)}
    };
    loadData();
  }, [id]);

  const totalDays = profile ? Math.floor(profile.total_minutes / 1440) : 0;

  const handleShare = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl)
      .then(() => {
        toast.success("Lien copié !", {
          style: {
            borderRadius: '15px',
            background: '#1A1A1A',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          },
          iconTheme: {
            primary: '#1DD05D',
            secondary: '#fff',
          },
        });
      })
      .catch((err) => {
        console.error("Erreur lors de la copie :", err);
        toast.error("Impossible de copier le lien");
      });
  };

  if (!profile)
    if (loading) return <ProfileSkeleton/>;
    else return <h1>Profil introuvable</h1>;

  return (
    <div className={PROFILE_STYLES.MAIN_WRAPPER}>
      {/* --- BANNIÈRE --- */}
      <div className={PROFILE_STYLES.BANNER_WRAPPER}>
        <img src={profile.banner} className={PROFILE_STYLES.BANNER_IMG} alt="Banner" />
        <div className={PROFILE_STYLES.GRADIENT_OVERLAY} />
      </div>

      <div className={PROFILE_STYLES.CONTAINER}>
        {/* HEADER PROFIL */}
        <AvatarContainer url={profile.avatar} username={profile.display_name} additional="mb-12">
          {/* --- ACTIONS --- */}
          <div className={PROFILE_STYLES.ACTION_GROUP}>
            {isOwner ? (
              <PrimaryButton onClick={() => router.push(`${FRONT_ROUTES.PROFILE_EDIT}`)} additional="px-8 py-3 gap-2">
                <EditIcon size={18}/>
                Modifier le profil
              </PrimaryButton>
            ) : (
              <SecondaryButton additional="py-3 px-8">
                Suivre l'utilisateur
              </SecondaryButton>
            )}
            <SecondaryButton additional="p-3" onClick={handleShare}>
              <ShareIcon size={20} />
            </SecondaryButton>
          </div>
        </AvatarContainer>

        <div className="mb-12 px-6">
          <p className="text3 text-lg leading-relaxed opacity-80 italic">
            {profile.bio}
          </p>
        </div>

        {/* STATS */}
        {profile.perms.stats && (
          <div className={PROFILE_STYLES.STATS_GRID}>
            <StatCard title="Temps d'écoute" sub="Total cumulé" color="text2"
              value={<>{profile.total_minutes.toLocaleString()} <span className="text-sm opacity-50">min</span><p className="text-sm opacity-50">({totalDays} j)</p></>}
            />
            <StatCard title="Nombre de streams" value={profile.total_streams.toLocaleString()} sub="Total cumulé" color="text-blue-400"/>
            <StatCard title="Heure de pointe" value={profile.peak_hour} sub="Le petit moment de plaisir" color="text-purple-400"/>
          </div>
        )}

        {profile.perms.dashboard && (
          <div className="flex justify-end mb-8">
            <span
              onClick={() => router.push(`/profile/dashboard/${id}`)}
              className={`text3 ${GENERAL_STYLES.TRANSITION_TEXT_VERT} ${GENERAL_STYLES.TRANSITION_ZOOM} flex gap-2 px-2 text-sm font-medium cursor-pointer`}
            ><BarChart3 size={18}/> Voir plus de statistiques détaillées</span>
          </div>
        )}

        {/* SECTIONS TOP 50 HORIZONTALES */}
        {profile.perms.favorites && (
          <div className="mt-8 space-y-20">
            <HorizontalTopSection title="50 meilleurs tracks" items={profile.top_50_tracks} count={20}/>
            <HorizontalTopSection title="50 meilleurs albums" items={profile.top_50_albums} count={20}/>
            <HorizontalTopSection title="50 meilleurs artistes" items={profile.top_50_artists} count={20}/>
          </div>
        )}
        

        {/* ÉCOUTES RÉCENTES */}
        {profile.perms.history && (
          <div className={PROFILE_STYLES.RECENT_CONTAINER}>
            <h2 className={PROFILE_STYLES.SECTION_TITLE}>Écoutes récentes</h2>
            <div className="space-y-2">
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
        )}
      </div>
    </div>
  );
}

/* --- SOUS-COMPOSANTS --- */

function HorizontalTopSection({ title, items, count }: { title: string, items: any[], count: number }) {
  return (
    <section className="flex flex-col gap-4 my-12">
      {/* Header de la section */}
      <div className="flex justify-between items-end px-2">
        <h2 className="text1 text-xl font-bold tracking-tight">{title}</h2>
        <span className="text-sm text-vert font-semibold cursor-pointer hover:underline opacity-80">
          Voir plus
        </span>
      </div>

      {/* Conteneur de scroll horizontal */}
      <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="flex-shrink-0 w-[100px] md:w-[120px] snap-start group cursor-pointer"
          >
            {/* Image avec Overlay de Rank */}
            <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-lg border border-white/5">
              <img 
                src={item.image_url}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110`} 
                alt={item.name} 
              />
              {/* Badge de classement */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                <span className="text-[10px] font-mono font-bold text-white">#{index + 1}</span>
              </div>
              {/* Overlay Play au hover */}
              {/* <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <div className="w-12 h-12 bg-vert rounded-full flex items-center justify-center shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform">
                    <span className="text-bg1 ml-1">▶</span>
                 </div>
              </div> */}
            </div>

            {/* Légendes */}
            <div className="space-y-1">
              <p className="text1 font-bold truncate group-hover:text-vert transition-colors">{item.name}</p>
              <p className="text3 text-xs truncate opacity-60 font-medium">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({ title, value, sub, color }: { 
  title: string, 
  value: React.ReactNode,
  sub: string, 
  color: string 
}) {
  return (
    <div className="flex flex-col justify-between bg-bg2/40 backdrop-blur-md border border-white/5 p-5 rounded-3xl hover:border-white/10 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -mr-12 -mt-12 group-hover:bg-vert/5 transition-colors" />
      <p className={`text3 text-[10px] uppercase tracking-[0.2em] mb-2 relative z-10`}>{title}</p>
      <h3 className={`text-3xl font-bold mb-1 relative z-10 ${color}`}>{value}</h3>
      <p className={`text3 text-[11px] italic relative z-10`}>{sub}</p>
    </div>
  );
}

const EditIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const ShareIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>

const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
);

export function ProfileSkeleton() {
  return (
    <div className={PROFILE_STYLES.MAIN_WRAPPER}>
      {/* --- BANNIÈRE SKELETON --- */}
      <div className={PROFILE_STYLES.BANNER_WRAPPER}>
        <div className="w-full h-full bg-white/5 animate-pulse" />
        <div className={PROFILE_STYLES.GRADIENT_OVERLAY} />
      </div>

      <div className={PROFILE_STYLES.CONTAINER}>
        {/* HEADER PROFIL SKELETON */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-12 relative -mt-16 md:-mt-20">
          {/* Avatar circle */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-4xl border-4 border-bg1 bg-white/10 animate-pulse shadow-2xl" />
          
          <div className="flex-1 flex flex-col items-center md:items-start gap-3">
             <SkeletonPulse className="h-10 w-48 md:w-64" />
             <div className="flex gap-2">
                <SkeletonPulse className="h-10 w-32 rounded-full" />
                <SkeletonPulse className="h-10 w-10 rounded-full" />
             </div>
          </div>
        </div>

        {/* BIO SKELETON */}
        <div className="mb-12 px-6 space-y-3">
          <SkeletonPulse className="h-4 w-full opacity-60" />
          <SkeletonPulse className="h-4 w-[90%] opacity-40" />
          <SkeletonPulse className="h-4 w-[40%] opacity-20" />
        </div>

        {/* STATS GRID SKELETON */}
        <div className={PROFILE_STYLES.STATS_GRID}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg2/40 border border-white/5 p-5 rounded-3xl h-32 flex flex-col justify-between">
               <SkeletonPulse className="h-3 w-20" />
               <SkeletonPulse className="h-8 w-32" />
               <SkeletonPulse className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* SECTIONS TOP 50 SKELETON */}
        <div className="mt-8 space-y-20">
          {[1, 2].map((section) => (
            <div key={section} className="flex flex-col gap-6">
              <div className="flex justify-between items-end px-2">
                <SkeletonPulse className="h-6 w-40" />
                <SkeletonPulse className="h-4 w-16" />
              </div>
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="flex-shrink-0 w-[100px] md:w-[120px]">
                    <SkeletonPulse className="aspect-square w-full rounded-xl mb-3" />
                    <SkeletonPulse className="h-4 w-full mb-2" />
                    <SkeletonPulse className="h-3 w-2/3 opacity-50" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ÉCOUTES RÉCENTES SKELETON */}
        <div className={PROFILE_STYLES.RECENT_CONTAINER + " mt-20"}>
          <SkeletonPulse className="h-6 w-48 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <SkeletonPulse className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <SkeletonPulse className="h-4 w-1/3" />
                  <SkeletonPulse className="h-3 w-1/4 opacity-50" />
                </div>
                <SkeletonPulse className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}