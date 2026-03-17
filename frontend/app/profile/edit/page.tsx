"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { PrimaryButton } from "@/app/components/Atomic/Buttons";
import { useAuth } from "@/app/hooks/useAuth";
import { useProfile } from "@/app/hooks/useProfile";
import toast from "react-hot-toast";
import Image from "next/image";

export default function EditProfilePage() {
  return (
    <ProtectedRoute skeleton={<ProfileEditSkeleton/>}>
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
  TOGGLE_CARD: (disabled:boolean) => `flex items-center justify-between ${disabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`,
  TOGGLE_LABEL: `text1 text-sm font-medium`,
  TOGGLE_DESC: `text3 text-xs`,
  TOGGLE_SWITCH: "w-12 h-6 bg-vert rounded-full relative cursor-pointer",
  TOGGLE_KNOB: "absolute right-1 top-1 w-4 h-4 bg-white rounded-full",

  // Footer Actions
  FOOTER: "flex items-center justify-end gap-4 mt-10",
  BTN_CANCEL: `text3 px-6 py-3 text-gray-400 hover:text-white transition-colors cursor-pointer`
};

const RESERVED_SLUGS = ["dashboard", "edit", "settings", "admin", "login", "api"];

function EditProfileContent() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { getEditableProfile, patchProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({
    errorName: "",
    errorBio: "",
    errorSlug: ""
  });
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    slug: "",
    avatar_url: "",
    banner_url: "",
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
          avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          banner_url: data.banner_url || "/banner_template.jpg",
          slug: data.slug,
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
    if (errors.errorBio !== "" || errors.errorName !== "" || errors.errorSlug !== "") return;
    const finalSlug = formData.slug && formData.slug.trim();
    const payload = {
      display_name: formData.display_name,
      bio: formData.bio,
      avatar_url: formData.avatar_url,
      banner_url: formData.banner_url === "/template_banner.jpg" ? null : formData.banner_url,
      slug: finalSlug === "" ? null : finalSlug,
      perms: formData.perms
    };
    try {
      await patchProfile('' + user.id, payload);
      toast.success("Profil modifié !", {
        style: {borderRadius: '15px',background: '#1A1A1A',
          color: '#fff',border: '1px solid rgba(255,255,255,0.1)'
        },
        iconTheme: {primary: '#1DD05D',secondary: '#fff'}
      });
      await refreshUser();
      router.push(`/profile/${finalSlug === "" || !finalSlug  ? user.id : finalSlug}`);
    } catch (err: any) {
      if (err.status === 422) return;// setMessage({type: "error",text: "Votre pseudonyme doit faire au moins 3 caractères"});
      else return; // setMessage({type: "error",text: err.message});
    }
  };

  const updatePerm = (key: string, value: boolean) => {
    setFormData(prev => {
      const newPerms = { ...prev.perms, [key]: value };
      if (key === 'profile' && value === false)
        Object.keys(newPerms).forEach(k => newPerms[k as keyof typeof newPerms] = false);
      return { ...prev, perms: newPerms };
    });
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérification de la taille (ex: 2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert("L'image est trop lourde (max 2MB)");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, banner_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérification de la taille (ex: 2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert("L'image est trop lourde (max 2MB)");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <ProfileEditSkeleton />;

  console.log(formData.avatar_url)

  return (
    <main className={PROFILE_EDIT_STYLES.MAIN}>
      {/* --- ÉDITION BANNIÈRE --- */}
      <div className={PROFILE_EDIT_STYLES.BANNER_WRAPPER}>
        <input 
          type="file" 
          ref={bannerInputRef}
          onChange={handleBannerChange}
          accept="image/*"
          className="hidden" 
        />
        {formData.banner_url === "/banner_template.jpg"
          ? <Image src="/banner_template_1100x390.jpg" alt="Banner" className={PROFILE_EDIT_STYLES.BANNER_IMG} width={1100} height={390}/>
          : <img src={formData.banner_url} className={PROFILE_EDIT_STYLES.BANNER_IMG} alt="Banner"/>
        }
        <div className={PROFILE_EDIT_STYLES.BANNER_OVERLAY} onClick={() => bannerInputRef.current?.click()} style={{ cursor: 'pointer' }}>
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
            <input 
              type="file" 
              ref={avatarInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden" 
            />
            <img src={formData.avatar_url} className={PROFILE_EDIT_STYLES.AVATAR_IMG} alt="Avatar Preview"/>
            <div className={PROFILE_EDIT_STYLES.OVERLAY_ICON} onClick={() => avatarInputRef.current?.click()} style={{ cursor: 'pointer' }}>
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
            <div className="flex justify-between">
              <label className={PROFILE_EDIT_STYLES.LABEL}>Nom d'affichage</label>
              <p className={`block text-xs mb-2 ml-1
                ${(formData.display_name || "").length < 3 ? 'text-rouge' : (formData.display_name || "").length > 14 ? (formData.display_name.length > 17 ? (formData.display_name.length >= 20 ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(formData.display_name?.length || 0)}/20</p>
            </div>
            <input 
              type="text" 
              className={PROFILE_EDIT_STYLES.INPUT}
              value={formData.display_name}
              onChange={(e) => {
                if (e.target.value.length < 3) setErrors({...errors, errorName: "Le nom d'affichage doit faire au moins 3 caractères."});
                else if (e.target.value.length > 20) setErrors({...errors, errorName: "Le nom d'affichage doit faire maximum 20 caractères."});
                else setErrors({...errors, errorName: ""});
                setFormData({...formData, display_name: e.target.value})
              }}
              placeholder="Votre nom..."
            />
            {errors.errorName && (<label className={`${PROFILE_EDIT_STYLES.LABEL} text-rouge text-[9px] pt-2`}>{errors.errorName}</label>)}
          </div>

          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between">
              <label className={PROFILE_EDIT_STYLES.LABEL}>Description</label>
              <p className={`block text-xs mb-2 ml-1
                ${(formData.bio || "").length > 400 ? (formData.bio.length > 450 ? (formData.bio.length >= 500 ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(formData.bio?.length || 0)}/500</p>
            </div>
            <textarea rows={4} className={PROFILE_EDIT_STYLES.TEXTAREA}
              value={formData.bio} placeholder="Dites-en un peu plus sur vos goûts musicaux..."
              onChange={(e) => {
                if (e.target.value.length > 500) setErrors({...errors,errorBio: "La bio doit faire 500 caracètres maximum."});
                else setErrors({...errors, errorName: ""});
                setFormData({...formData, bio: e.target.value})
              }}
            />
            {errors.errorBio && (<label className={`${PROFILE_EDIT_STYLES.LABEL} text-rouge text-[9px] pt-2`}>{errors.errorBio}</label>)}
          </div>

          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between">
              <label className={PROFILE_EDIT_STYLES.LABEL}>URL personnalisée</label>
              <p className={`block text-xs mb-2 ml-1
                ${(formData.slug || "").length > 20 ? (formData.slug.length > 25 ? (formData.slug.length === 30 ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(formData.slug?.length || 0)}/30</p>
            </div>
            <div className="relative flex items-center">
              {/* Préfixe de l'URL */}
              <span className="absolute left-4 text-white/30 text-sm font-medium pointer-events-none">
                mystatsfy.com/profile/
              </span>
              
              <input 
                type="text" 
                className={`${PROFILE_EDIT_STYLES.INPUT} pl-[145px] text-md tracking-wider`} 
                value={formData.slug || ""}
                placeholder="votre-url"
                onChange={(e) => {
                  let value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  // Nombre pur et Mot réservé et taille <= 30
                  if (!/^\d+$/.test(value) && !RESERVED_SLUGS.includes(value) && value.length <= 30) setFormData({...formData, slug: value});
                  else if (value === "") setFormData({...formData, slug: ""})
                }}
              />
            </div>
            <p className="text-[10px] text-white/40 mt-2 ml-1">
              Utilisez uniquement des lettres, des chiffres et des tirets.
            </p>
            {errors.errorSlug && (<label>{errors.errorSlug}</label>)}
          </div>

          {/* --- RÉGLAGES PRIVAUTÉ --- */}
          <div className="flex flex-col justify-center mt-8">
            <p className={PROFILE_EDIT_STYLES.LABEL}>Permissions et accès</p>
            <div className="flex flex-col gap-8 p-4 border border-white/5 bg-white/5 rounded-2xl w-full">
              <OptionToggle title="Profil public" description="Autoriser les autres à accéder à votre profil"
                active={formData.perms.profile} onChange={(v:boolean) => updatePerm('profile',v)}
              />
              <OptionToggle title="Statistiques public" description="Autoriser les autres à voir vos statistiques"
                active={formData.perms.stats} onChange={(v:boolean) => updatePerm('stats',v)} disabled={!formData.perms.profile}
              />
              <OptionToggle title="Favoris public" description="Autoriser les autres à voir vos 50 favoris (tracks, albums et artistes)"
                active={formData.perms.favorites} onChange={(v:boolean) => updatePerm('favorites',v)} disabled={!formData.perms.profile}
              />
              <OptionToggle title="Historique public" description="Autoriser les autres à voir votre historique"
                active={formData.perms.history} onChange={(v:boolean) => updatePerm('history',v)} disabled={!formData.perms.profile}
              />
              <OptionToggle title="Dashboard public" description="Autoriser les autres à accéder à votre dashboard"
                active={formData.perms.dashboard} onChange={(v:boolean) => updatePerm('dashboard',v)} disabled={!formData.perms.profile}
              />
            </div>
          </div>

          {/* --- ACTIONS --- */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <button onClick={() => router.back()} className={PROFILE_EDIT_STYLES.BTN_CANCEL}>
              Annuler
            </button>
            <PrimaryButton onClick={handleSave} additional="px-6 py-2.5" disabled={errors.errorBio !== "" || errors.errorName !== "" || errors.errorSlug !== ""}>
              Enregistrer les modifications
            </PrimaryButton>
          </div>
        </div>
      </div>
    </main>
  );
}

function OptionToggle({title,description,active,onChange,disabled}:any) {
  return (
    <div className={PROFILE_EDIT_STYLES.TOGGLE_CARD(disabled)}>
      <div>
        <p className={PROFILE_EDIT_STYLES.TOGGLE_LABEL}>{title}</p>
        <p className={PROFILE_EDIT_STYLES.TOGGLE_DESC}>{description}</p>
      </div>
      <div className={`
        ${PROFILE_EDIT_STYLES.TOGGLE_SWITCH} 
        transition-colors duration-200
        ${active ? 'bg-vert' : 'bg-white/10'}
      `} onClick={() => !disabled && onChange(!active)}>
        <div className={`
          ${PROFILE_EDIT_STYLES.TOGGLE_KNOB}
          transition-transform duration-200 ease-in-out
          ${active ? 'translate-x-0' : '-translate-x-6'}
        `}/>
      </div>
    </div>
  );
}

const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
);

export function ProfileEditSkeleton() {
  return (
    <main className={PROFILE_EDIT_STYLES.MAIN}>
      {/* --- SKELETON BANNIÈRE --- */}
      <div className={PROFILE_EDIT_STYLES.BANNER_WRAPPER}>
        <div className={`w-full h-full bg-white/5 animate-pulse`} />
        <div className={PROFILE_EDIT_STYLES.BANNER_GRADIENT} />
      </div>

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- SKELETON HEADER --- */}
        <div className={PROFILE_EDIT_STYLES.HEADER_FLEX}>
          <div className={PROFILE_EDIT_STYLES.AVATAR_WRAPPER}>
            <div className="w-full h-full rounded-4xl bg-white/10 animate-pulse" />
          </div>
          
          <div className={PROFILE_EDIT_STYLES.TEXT_GROUP}>
            <SkeletonPulse className="h-8 w-48 mb-2" />
            <SkeletonPulse className="h-4 w-64" />
          </div>
        </div>

        {/* --- SKELETON FORMULAIRE --- */}
        <div className={PROFILE_EDIT_STYLES.FORM_CARD}>
          {/* Nom d'affichage */}
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <SkeletonPulse className="h-4 w-24 mb-3" />
            <SkeletonPulse className="h-12 w-full" />
          </div>

          {/* Bio */}
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between mb-3">
              <SkeletonPulse className="h-4 w-20" />
              <SkeletonPulse className="h-3 w-12" />
            </div>
            <SkeletonPulse className="h-32 w-full" />
          </div>

          {/* Permissions */}
          <div className="flex flex-col justify-center mt-4">
            <SkeletonPulse className="h-4 w-32 mb-4" />
            <div className="flex flex-col gap-8 p-4 border border-white/5 bg-white/5 rounded-2xl w-full">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex flex-col gap-2">
                    <SkeletonPulse className="h-4 w-32" />
                    <SkeletonPulse className="h-3 w-64" />
                  </div>
                  <SkeletonPulse className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <SkeletonPulse className="h-10 w-24" />
            <SkeletonPulse className="h-10 w-48" />
          </div>
        </div>
      </div>
    </main>
  );
}

// --- ICONES ---
const CameraIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);