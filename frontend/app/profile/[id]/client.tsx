"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useProfile } from "@/app/hooks/useProfile";
import { BarChart3 } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/app/components/Atomic/Buttons";
import { ErrorState } from "@/app/components/Atomic/Error/Error";
import { UserProfile } from "@/app/data/DataInfos";
import { AvatarContainer } from "@/app/components/Atomic/Profile/Profile";
import toast from "react-hot-toast";
import { GENERAL_STYLES } from "@/app/styles/general";
import { FRONT_ROUTES } from "@/app/constants/routes";
import { ApiError } from "../../services/api";
import { ProfileSkeleton } from "./Skeleton";
import { HorizontalTopSection, StatCard } from "./components";
import Image from 'next/image';

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
  const [error, setError] = useState<ApiError | null>(null);
  const { getProfile } = useProfile();
  const { user: currentUser } = useAuth();

  const isOwner = useMemo(() => {
    if (!currentUser || !id) return false;
    const profileIdOrSlug = id.toString().toLowerCase();
    const currentUserId = currentUser.id?.toString().toLowerCase();
    const currentUserSlug = currentUser.slug?.toLowerCase();
    return currentUserId === profileIdOrSlug || currentUserSlug === profileIdOrSlug;
  }, [currentUser, id]);

  useEffect(() => {
    if (!id || id === 'undefined') return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProfile(id);
        setProfile(data);
      } catch (err: any) {setError(err instanceof ApiError ? err : new ApiError(err.status,"Erreur inconnue"))}
      finally {setLoading(false)}
    };
    loadData();
  }, [id]);

  const totalDays = profile ? Math.floor(profile.total_minutes / 1440) : 0;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié !", {
        style: { borderRadius: '15px', background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        iconTheme: { primary: '#1DD05D', secondary: '#fff' },
      });
    } catch (err) {toast.error("Impossible de copier le lien")}
  };

  if (error instanceof ApiError && error.status === 404) return <ErrorState title="Profil introuvable" status={error.status}/>;
  if (loading || !profile) return <ProfileSkeleton/>;
  return (
    <div className={PROFILE_STYLES.MAIN_WRAPPER}>
      {/* --- BANNIÈRE --- */}
      <div className={PROFILE_STYLES.BANNER_WRAPPER}>
        {profile.banner === "/banner_template.jpg"
          ? <Image src="/banner_template_1100x390.jpg" alt="Banner" className={PROFILE_STYLES.BANNER_IMG} width={1100} height={390}/>
          : <img src={profile.banner} className={PROFILE_STYLES.BANNER_IMG} alt="Banner"/>
        }
        <div className={PROFILE_STYLES.GRADIENT_OVERLAY}/>
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
        {(profile.perms.favorites && profile.top_50_tracks.length > 0) && (
          <div className="mt-8 space-y-20">
            <HorizontalTopSection title="50 meilleurs tracks" items={profile.top_50_tracks}/>
            <HorizontalTopSection title="50 meilleurs albums" items={profile.top_50_albums}/>
            <HorizontalTopSection title="50 meilleurs artistes" items={profile.top_50_artists}/>
          </div>
        )}
        

        {/* ÉCOUTES RÉCENTES */}
        {profile.perms.history && (
          <div className={PROFILE_STYLES.RECENT_CONTAINER}>
            <h2 className={PROFILE_STYLES.SECTION_TITLE}>Écoutes récentes</h2>
            <div className="space-y-2">
              {profile.top_50_tracks.length === 0 ? (
                <div className={PROFILE_STYLES.TRACK_ITEM}>
                  <p className={PROFILE_STYLES.TRACK_NAME}>Aucune écoute</p>
                </div>
              ) : (
                profile.recent_tracks.map((track) => (
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
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- SOUS-COMPOSANTS --- */

const EditIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const ShareIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>