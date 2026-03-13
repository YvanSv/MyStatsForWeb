"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { GENERAL_STYLES } from "@/app/styles/general";
import { PrimaryButton } from "@/app/components/Atomic/Buttons";
import { useAuth } from "@/app/hooks/useAuth";
import { useProfile } from "@/app/hooks/useProfile";
import { API_ENDPOINTS } from "@/app/constants/routes";
import toast from "react-hot-toast";

export default function EditProfilePage() {
  return (
    <ProtectedRoute skeleton={<EditProfileSkeleton/>}>
      <EditProfileContent/>
    </ProtectedRoute>
  );
}

const PROFILE_EDIT_STYLES = {
  MAIN: "min-h-screen pb-20 bg-bg1",
  
  // Banner Section
  BANNER_WRAPPER: "relative h-[250px] w-full group cursor-pointer overflow-hidden bg-bg2",
  BANNER_IMG: "w-full h-full object-cover opacity-40 transition-opacity group-hover:opacity-30 duration-300",
  BANNER_OVERLAY: `text-white/50 absolute inset-0 flex items-center justify-center font-medium`,
  BANNER_BADGE: "flex items-center text1/10 z-10 gap-2 bg-black/10 px-4 py-2 rounded-full backdrop-blur-md",
  BANNER_GRADIENT: "absolute inset-0 bg-gradient-to-t from-bg1 to-transparent",

  // Profile Header
  CONTAINER: "max-w-5xl mx-auto px-6 -mt-20 relative z-10",
  HEADER_FLEX: "flex flex-col md:flex-row items-center md:items-end gap-6",
  TEXT_GROUP: "flex-1 text-center md:text-left mb-4",
  TITLE: `text1 text-3xl font-bold mb-1`,
  SUBTITLE: `text3 text-sm`,

  // Avatar Edit
  AVATAR_WRAPPER: "relative w-40 h-40 group cursor-pointer mx-auto md:mx-0",
  AVATAR_IMG: "w-full h-full rounded-[35px] border-4 border-bg1 bg-bg2 object-cover shadow-2xl transition-all group-hover:brightness-50",
  OVERLAY_ICON: `text1 absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`,

  // Form
  FORM_CARD: "bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 mt-12",
  FIELD_GROUP: "mb-6",
  LABEL: `text3 block text-xs uppercase tracking-widest mb-2 ml-1`,
  INPUT: `text1 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-vert/50 transition-all`,
  TEXTAREA: `text1 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-vert/50 transition-all resize-none`,
  
  // Privacy Toggle
  TOGGLE_CARD: "flex items-center justify-between",
  TOGGLE_LABEL: `text1 text-sm font-medium`,
  TOGGLE_DESC: `text3 text-xs`,
  TOGGLE_SWITCH: "w-12 h-6 bg-vert rounded-full relative cursor-pointer",
  TOGGLE_KNOB: "absolute right-1 top-1 w-4 h-4 bg-white rounded-full",

  // Footer Actions
  FOOTER: "flex items-center justify-end gap-4 mt-10",
  BTN_CANCEL: `text3 px-6 py-3 text-gray-400 hover:text-white transition-colors cursor-pointer`
};

function EditProfileContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { getEditableProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    display_name: "...",
    bio: "...",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    banner: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070",
    perms: {
      profile: true,
      stats: true,
      favorites: true,
      history: true,
      dashboard: true
    }
  });

  useEffect(() => {
    if (!user || !user.id) return;

    const fetchSettings = async () => {
      try {
        const data = await getEditableProfile(''+user.id);
        
        setFormData({
          display_name: data.display_name || "",
          bio: data.bio || "",
          avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.display_name}`,
          banner: data.banner_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070",
          perms: data.perms || {
            profile: true,
            stats: true,
            favorites: true,
            history: true,
            dashboard: true
          }
        });
      } catch (error) {
        console.error(error);
      } finally {setLoading(false)}
    };

    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user || !user.id) return;
    const response = await fetch(`${API_ENDPOINTS.EDITABLE_PROFILE_DATA}/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!response.ok) throw new Error("Erreur lors de la sauvegarde");
    
    toast.success("Profil modifié !", {
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
    router.push(`/profile/${user?.id}`);
  };

  const updatePerm = (key: keyof typeof formData.perms, value: boolean) => {
    setFormData({
      ...formData,
      perms: {
        ...formData.perms,
        [key]: value
      }
    });
  };

  if (loading) return <EditProfileSkeleton />;

  return (
    <main className={PROFILE_EDIT_STYLES.MAIN}>
      {/* --- ÉDITION BANNIÈRE --- */}
      <div className={PROFILE_EDIT_STYLES.BANNER_WRAPPER}>
        <img src={formData.banner} className={PROFILE_EDIT_STYLES.BANNER_IMG} alt="Banner Preview" />
        <div className={PROFILE_EDIT_STYLES.BANNER_OVERLAY}>
          <div className={PROFILE_EDIT_STYLES.BANNER_BADGE}>
            <CameraIcon size={18} /> Changer la bannière
          </div>
        </div>
        <div className={PROFILE_EDIT_STYLES.BANNER_GRADIENT} />
      </div>

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- ÉDITION AVATAR --- */}
        <div className={PROFILE_EDIT_STYLES.HEADER_FLEX}>
          <div className={PROFILE_EDIT_STYLES.AVATAR_WRAPPER}>
            <img src={formData.avatar} className={PROFILE_EDIT_STYLES.AVATAR_IMG} alt="Avatar Preview" />
            <div className={PROFILE_EDIT_STYLES.OVERLAY_ICON}>
              <CameraIcon size={32} />
            </div>
          </div>
          
          <div className={PROFILE_EDIT_STYLES.TEXT_GROUP}>
            <h1 className={PROFILE_EDIT_STYLES.TITLE}>Modifier le profil</h1>
            <p className={PROFILE_EDIT_STYLES.SUBTITLE}>Personnalisez votre apparence publique</p>
          </div>
        </div>

        {/* --- FORMULAIRE --- */}
        <div className={PROFILE_EDIT_STYLES.FORM_CARD}>
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <label className={PROFILE_EDIT_STYLES.LABEL}>Nom d'affichage</label>
            <input 
              type="text" 
              className={PROFILE_EDIT_STYLES.INPUT}
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              placeholder="Votre nom..."
            />
          </div>

          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between">
              <label className={PROFILE_EDIT_STYLES.LABEL}>Description</label>
              <p className={`block text-xs mb-2 ml-1 ${formData.bio.length === 500 ? 'text-rouge' : 'text2'}`}>{formData.bio.length}/500</p>
            </div>
            <textarea rows={4} className={PROFILE_EDIT_STYLES.TEXTAREA}
              value={formData.bio} placeholder="Dites-en un peu plus sur vos goûts musicaux..."
              onChange={(e) => e.target.value.length < 500 && setFormData({...formData, bio: e.target.value})}
            />
          </div>

          {/* --- RÉGLAGES PRIVAUTÉ --- */}
          <div className="flex flex-col justify-center mt-4">
            <p className={PROFILE_EDIT_STYLES.LABEL}>Permissions et accès</p>
            <div className="flex flex-col gap-8 p-4 border border-white/5 bg-white/5 rounded-2xl w-full">
              <OptionToggle title="Profil public" description="Autoriser les autres à accéder à votre profil"
                active={formData.perms.profile} onChange={(v:boolean) => updatePerm('profile',v)}
              />
              <OptionToggle title="Statistiques public" description="Autoriser les autres à voir vos statistiques"
                active={formData.perms.stats} onChange={(v:boolean) => updatePerm('stats',v)}
              />
              <OptionToggle title="Favoris public" description="Autoriser les autres à voir vos 50 favoris (tracks, albums et artistes)"
                active={formData.perms.favorites} onChange={(v:boolean) => updatePerm('favorites',v)}
              />
              <OptionToggle title="Historique public" description="Autoriser les autres à voir votre historique"
                active={formData.perms.history} onChange={(v:boolean) => updatePerm('history',v)}
              />
              <OptionToggle title="Dashboard public" description="Autoriser les autres à accéder à votre dashboard"
                active={formData.perms.dashboard} onChange={(v:boolean) => updatePerm('dashboard',v)}
              />
            </div>
          </div>

          {/* --- ACTIONS --- */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <button onClick={() => router.back()} className={PROFILE_EDIT_STYLES.BTN_CANCEL}>
              Annuler
            </button>
            <PrimaryButton onClick={handleSave} additional="px-6 py-2.5">
              Enregistrer les modifications
            </PrimaryButton>
          </div>
        </div>
      </div>
    </main>
  );
}

function OptionToggle({title,description,active,onChange}:any) {
  return (
    <div className={PROFILE_EDIT_STYLES.TOGGLE_CARD}>
      <div>
        <p className={PROFILE_EDIT_STYLES.TOGGLE_LABEL}>{title}</p>
        <p className={PROFILE_EDIT_STYLES.TOGGLE_DESC}>{description}</p>
      </div>
      <div className={`
        ${PROFILE_EDIT_STYLES.TOGGLE_SWITCH} 
        transition-colors duration-200
        ${active ? 'bg-vert' : 'bg-white/10'} 
      `} onClick={() => onChange(!active)}>
        <div className={`
          ${PROFILE_EDIT_STYLES.TOGGLE_KNOB}
          transition-transform duration-200 ease-in-out
          ${active ? 'translate-x-0' : '-translate-x-6'}
        `}/>
      </div>
    </div>
  );
}

const SKELETON_STYLES = {
  // Base Pulse
  PULSE: "animate-pulse bg-white/5",
  
  // Custom Shapes
  BANNER: "h-[250px] w-full bg-bg2",
  AVATAR: "w-40 h-40 rounded-[35px] border-4 border-bg1 bg-white/10",
  TEXT_LG: "h-8 w-48 rounded-lg mb-2",
  TEXT_SM: "h-4 w-64 rounded-lg",
  CARD: "bg-bg2/30 border border-white/5 rounded-[40px] p-8 mt-12",
  LABEL: "h-3 w-24 rounded bg-white/10 mb-3 ml-1",
  INPUT: "h-12 w-full rounded-2xl bg-white/5 border border-white/10",
  TEXTAREA: "h-32 w-full rounded-2xl bg-white/5 border border-white/10",
  BUTTON: "h-12 w-40 rounded-2xl bg-white/10"
};

function EditProfileSkeleton() {
  return (
    <div className={PROFILE_EDIT_STYLES.MAIN}>
      {/* --- BANNER SKELETON --- */}
      <div className={`${SKELETON_STYLES.BANNER} ${SKELETON_STYLES.PULSE}`} />

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- HEADER SKELETON --- */}
        <div className={PROFILE_EDIT_STYLES.HEADER_FLEX}>
          <div className={`${SKELETON_STYLES.AVATAR} ${SKELETON_STYLES.PULSE}`} />
          
          <div className={PROFILE_EDIT_STYLES.TEXT_GROUP}>
            <div className={`${SKELETON_STYLES.TEXT_LG} ${SKELETON_STYLES.PULSE}`} />
            <div className={`${SKELETON_STYLES.TEXT_SM} ${SKELETON_STYLES.PULSE}`} />
          </div>
        </div>

        {/* --- FORM CARD SKELETON --- */}
        <div className={SKELETON_STYLES.CARD}>
          {/* Field: Name */}
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className={`${SKELETON_STYLES.LABEL} ${SKELETON_STYLES.PULSE}`} />
            <div className={`${SKELETON_STYLES.INPUT} ${SKELETON_STYLES.PULSE}`} />
          </div>

          {/* Field: Bio */}
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className={`${SKELETON_STYLES.LABEL} ${SKELETON_STYLES.PULSE}`} />
            <div className={`${SKELETON_STYLES.TEXTAREA} ${SKELETON_STYLES.PULSE}`} />
          </div>

          {/* Privacy Toggle Skeleton */}
          <div className={PROFILE_EDIT_STYLES.TOGGLE_CARD}>
            <div className="space-y-2">
              <div className={`${SKELETON_STYLES.LABEL} w-20 ${SKELETON_STYLES.PULSE}`} />
              <div className={`${SKELETON_STYLES.TEXT_SM} w-40 ${SKELETON_STYLES.PULSE}`} />
            </div>
            <div className="w-12 h-6 rounded-full bg-white/10 animate-pulse" />
          </div>

          {/* Footer Actions Skeleton */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
            <div className={`${SKELETON_STYLES.BUTTON} ${SKELETON_STYLES.PULSE}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ICONES ---
const CameraIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);