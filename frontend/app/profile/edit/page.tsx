"use client";

import { TOAST_STYLE } from "@/app/constants/ui";
import { SITE_HOST } from "@/app/constants/app";
import { defaultAvatar } from "@/app/constants/images";
import { FRONT_ROUTES } from "@/app/constants/routes";
import { NAME_MIN, NAME_MAX, NAME_WARN, NAME_DANGER, BIO_MAX, BIO_WARN, BIO_DANGER, MAX_IMAGE_BYTES } from "@/app/constants/validation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { PrimaryButton } from "@/app/components/Atomic/Buttons";
import { useAuth } from "@/app/context/authContext";
import { useProfile } from "@/app/hooks/useProfile";
import toast from "react-hot-toast";
import Image from "next/image";
import { ProfileEditSkeleton } from "./Skeleton";
import { OptionToggle } from "./OptionToggle";
import { useLanguage } from "@/app/context/languageContext";
import { ErrorState } from "@/app/components/Atomic/Error/Error";
import { DEFAULT_BANNER, DEFAULT_BANNER_IMAGE, isDefaultBanner } from "@/app/constants/images";

export default function EditProfilePage() {
  return (
    <ProtectedRoute skeleton={<ProfileEditSkeleton/>}>
      <EditProfileContent/>
    </ProtectedRoute>
  );
}

// Seuils propres au slug (compteur : jaune, orange, rouge)
const SLUG_WARN = 20;
const SLUG_DANGER = 25;
const SLUG_MAX = 30;
// Marge gauche du champ : laisse la place au préfixe « hôte/profile/ » affiché devant
const SLUG_PREFIX_PADDING = `calc(${SITE_HOST.length + "/profile/".length}ch + 2rem)`;

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
  
  // Footer Actions
  FOOTER: "flex items-center justify-end gap-4 mt-10",
  BTN_CANCEL: `text3 px-6 py-3 text-gray-400 hover:text-white transition-colors cursor-pointer`
};

// Mêmes règles que le serveur : jamais de SVG
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const RESERVED_SLUGS = ["dashboard", "edit", "settings", "admin", "login", "api"];

const ALL_PERMS = { profile: true, stats: true, favorites: true, history: true, dashboard: true };
type PermKey = keyof typeof ALL_PERMS;
type FormData = {
  display_name: string; bio: string; slug: string; avatar_url: string; banner_url: string;
  perms: typeof ALL_PERMS;
  // Permissions à restaurer quand le profil redevient public
  savedPerms: typeof ALL_PERMS;
};

function EditProfileContent() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const dict = t.profileEdit;
  const errDict = t.account;
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { getEditableProfile, patchProfile } = useProfile();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  // Garde synchrone : un second clic peut arriver avant le re-rendu qui désactive le bouton
  const savingRef = useRef(false);
  const [formData, setFormData] = useState<FormData>({
    display_name: "",
    bio: "",
    slug: "",
    avatar_url: "",
    banner_url: "",
    perms: { ...ALL_PERMS },
    savedPerms: { ...ALL_PERMS }
  });
  // Images chargées : seules celles modifiées par l'utilisateur sont envoyées au PATCH
  const [initialImages, setInitialImages] = useState({ avatar_url: "", banner_url: "" });

  // Erreurs calculées à partir des valeurs (donc aussi pour un profil chargé invalide)
  const name = formData.display_name || "";
  const bio = formData.bio || "";
  const slug = (formData.slug || "").trim();
  const errors = {
    errorName: name.length < NAME_MIN ? errDict.errorName1 : name.length > NAME_MAX ? errDict.errorName2 : "",
    errorBio: bio.length > BIO_MAX ? dict.errorBio : "",
    errorSlug: /^\d+$/.test(slug) ? dict.errorSlugNumeric
      : RESERVED_SLUGS.includes(slug) ? dict.errorSlugReserved
      : slug.length > SLUG_MAX ? dict.errorSlugLength : "",
  };
  const hasError = errors.errorName !== "" || errors.errorBio !== "" || errors.errorSlug !== "";

  // Ne recharge que si l'utilisateur change (ou sur « Réessayer »), jamais pour un nouvel objet identique
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    const fetchSettings = async () => {
      try {
        const data = await getEditableProfile(''+userId);
        if (cancelled) return;
        const avatar = data.avatar_url || defaultAvatar(userId);
        const banner = data.banner_url || DEFAULT_BANNER;
        const perms = data.perms ? { ...ALL_PERMS, ...data.perms } : { ...ALL_PERMS };
        setFormData({
          display_name: data.display_name || "",
          bio: data.bio || "",
          avatar_url: avatar,
          banner_url: banner,
          slug: data.slug || "",
          perms,
          savedPerms: perms
        });
        setInitialImages({ avatar_url: avatar, banner_url: banner });
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSettings();
    return () => { cancelled = true; };
  }, [userId, reloadKey, getEditableProfile]);

  const retryLoad = useCallback(() => setReloadKey(k => k + 1), []);

  const handleSave = async () => {
    if (!user || !user.id) return;
    if (hasError || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const finalSlug = slug;
    const payload: Record<string, unknown> = {
      display_name: formData.display_name,
      bio: formData.bio,
      slug: finalSlug === "" ? null : finalSlug,
      perms: formData.perms
    };
    // Avatar et bannière : uniquement s'ils ont été modifiés (évite d'enregistrer l'avatar par défaut)
    if (formData.avatar_url !== initialImages.avatar_url) payload.avatar_url = formData.avatar_url;
    if (formData.banner_url !== initialImages.banner_url)
      payload.banner_url = isDefaultBanner(formData.banner_url) ? null : formData.banner_url;
    try {
      await patchProfile('' + user.id, payload);
      toast.success(dict.successToast, {
        style: TOAST_STYLE,
        iconTheme: { primary: '#1DD05D', secondary: '#fff' },
      });
      await refreshUser();
      router.push(`${FRONT_ROUTES.PROFILE}/${finalSlug === "" ? user.id : finalSlug}`);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      // Les erreurs de validation (422) n'ont pas de message lisible : on affiche le texte générique
      toast.error(err?.status && err.status !== 422 && err.message ? err.message : dict.errorSave);
      savingRef.current = false;
      setSaving(false);
    }
  };

  const updatePerm = (key: PermKey, value: boolean) => {
    setFormData(prev => {
      if (key === 'profile') {
        if (value === prev.perms.profile) return prev;
        // Décocher mémorise les autres permissions ; recocher les restaure
        if (!value) return { ...prev, savedPerms: prev.perms, perms: { profile: false, stats: false, favorites: false, history: false, dashboard: false } };
        return { ...prev, perms: { ...prev.savedPerms, profile: true } };
      }
      return { ...prev, perms: { ...prev.perms, [key]: value } };
    });
  };

  // Retourne true si l'image est acceptable ; sinon prévient l'utilisateur (le serveur revérifie de toute façon)
  const checkImage = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(dict.errorImageType, { style: TOAST_STYLE });
      return false;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(dict.errorWeight, { style: TOAST_STYLE });
      return false;
    }
    return true;
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // On vide le champ pour pouvoir re-sélectionner le même fichier après un refus
    e.target.value = "";
    if (file) {
      if (!checkImage(file)) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, banner_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      if (!checkImage(file)) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <ProfileEditSkeleton/>;

  // Sans profil chargé, le formulaire serait vide et l'enregistrement écraserait le vrai profil
  if (loadFailed) {
    return (
      <main className={PROFILE_EDIT_STYLES.MAIN}>
        <div role="alert">
          <ErrorState message={dict.errorLoad} onRetry={retryLoad}/>
        </div>
      </main>
    );
  }

  return (
    <main className={PROFILE_EDIT_STYLES.MAIN}>
      {/* --- ÉDITION BANNIÈRE --- */}
      <div className={PROFILE_EDIT_STYLES.BANNER_WRAPPER}>
        <input type="file" ref={bannerInputRef} accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleBannerChange} className="hidden"
        />
        {isDefaultBanner(formData.banner_url)
          ? <Image src={DEFAULT_BANNER_IMAGE} alt={t.a11y.banner} className={PROFILE_EDIT_STYLES.BANNER_IMG} width={1100} height={390}/>
          : <img src={formData.banner_url} className={PROFILE_EDIT_STYLES.BANNER_IMG} alt={t.a11y.banner}/>
        }
        <div className={PROFILE_EDIT_STYLES.BANNER_OVERLAY} onClick={() => bannerInputRef.current?.click()} style={{ cursor: 'pointer' }}>
          <div className={PROFILE_EDIT_STYLES.BANNER_BADGE}>
            <CameraIcon size={18} /> {dict.changeBanner}
          </div>
        </div>
        <div className={PROFILE_EDIT_STYLES.BANNER_GRADIENT} />
      </div>

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- ÉDITION AVATAR --- */}
        <div className={PROFILE_EDIT_STYLES.HEADER_FLEX}>
          <div className={PROFILE_EDIT_STYLES.AVATAR_WRAPPER}>
            <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden"/>
            <img src={formData.avatar_url} className={PROFILE_EDIT_STYLES.AVATAR_IMG} alt={t.a11y.avatarPreview}/>
            <div className={PROFILE_EDIT_STYLES.OVERLAY_ICON} onClick={() => avatarInputRef.current?.click()} style={{ cursor: 'pointer' }}>
              <CameraIcon size={32} />
            </div>
          </div>
          
          <div className={PROFILE_EDIT_STYLES.TEXT_GROUP}>
            <h1 className={PROFILE_EDIT_STYLES.TITLE}>{dict.title}</h1>
            <p className={PROFILE_EDIT_STYLES.SUBTITLE}>{dict.subtitle}</p>
          </div>
        </div>

        {/* --- FORMULAIRE --- */}
        <div className={PROFILE_EDIT_STYLES.FORM_CARD}>
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between">
              <label htmlFor="profile-name" className={PROFILE_EDIT_STYLES.LABEL}>{dict.labelName}</label>
              <p className={`block text-xs mb-2 ml-1
                ${(formData.display_name || "").length < NAME_MIN ? 'text-rouge' : (formData.display_name || "").length > NAME_WARN ? (formData.display_name.length > NAME_DANGER ? (formData.display_name.length >= NAME_MAX ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(formData.display_name?.length || 0)}/{NAME_MAX}</p>
            </div>
            <input id="profile-name" type="text" aria-invalid={!!errors.errorName} aria-describedby={errors.errorName ? "profile-name-err" : undefined} className={PROFILE_EDIT_STYLES.INPUT} value={formData.display_name}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, display_name: value }));
              }}
              placeholder={dict.placeholderName}
            />
            {errors.errorName && (<p id="profile-name-err" role="alert" className={`${PROFILE_EDIT_STYLES.LABEL} text-rouge text-[9px] pt-2`}>{errors.errorName}</p>)}
          </div>

          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between">
              <label htmlFor="profile-bio" className={PROFILE_EDIT_STYLES.LABEL}>{dict.labelBio}</label>
              <p className={`block text-xs mb-2 ml-1
                ${(formData.bio || "").length > BIO_WARN ? (formData.bio.length > BIO_DANGER ? (formData.bio.length >= BIO_MAX ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(formData.bio?.length || 0)}/{BIO_MAX}</p>
            </div>
            <textarea id="profile-bio" rows={4} aria-invalid={!!errors.errorBio} aria-describedby={errors.errorBio ? "profile-bio-err" : undefined} className={PROFILE_EDIT_STYLES.TEXTAREA}
              value={formData.bio} placeholder={dict.placeholderBio}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, bio: value }));
              }}
            />
            {errors.errorBio && (<p id="profile-bio-err" role="alert" className={`${PROFILE_EDIT_STYLES.LABEL} text-rouge text-[9px] pt-2`}>{errors.errorBio}</p>)}
          </div>

          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between">
              <label htmlFor="profile-slug" className={PROFILE_EDIT_STYLES.LABEL}>{dict.labelUrl}</label>
              <p className={`block text-xs mb-2 ml-1
                ${(formData.slug || "").length > SLUG_WARN ? (formData.slug.length > SLUG_DANGER ? (formData.slug.length === SLUG_MAX ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(formData.slug?.length || 0)}/{SLUG_MAX}</p>
            </div>
            <div className="relative flex items-center">
              {/* Préfixe de l'URL */}
              <span className="absolute left-4 text-white/30 text-sm font-medium pointer-events-none">
                {SITE_HOST}/profile/
              </span>
              
              <input id="profile-slug" type="text" aria-invalid={!!errors.errorSlug} aria-describedby={errors.errorSlug ? "profile-slug-err" : undefined} className={`${PROFILE_EDIT_STYLES.INPUT} text-md tracking-wider`} style={{ paddingLeft: SLUG_PREFIX_PADDING }}
                value={formData.slug || ""} placeholder={dict.placeholderUrl}
                onChange={(e) => {
                  // Normalisation seulement : les valeurs invalides sont signalées par une erreur, pas ignorées
                  const value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  setFormData(prev => ({ ...prev, slug: value }));
                }}
              />
            </div>
            <p className="text-[10px] text-white/40 mt-2 ml-1">{dict.urlHint}</p>
            {errors.errorSlug && (<p id="profile-slug-err" role="alert" className={`${PROFILE_EDIT_STYLES.LABEL} text-rouge text-[9px] pt-2`}>{errors.errorSlug}</p>)}
          </div>

          {/* --- RÉGLAGES PRIVAUTÉ --- */}
          <div className="flex flex-col justify-center mt-8">
            <p className={PROFILE_EDIT_STYLES.LABEL}>{dict.labelPrivacy}</p>
            <div className="flex flex-col gap-8 p-4 border border-white/5 bg-white/5 rounded-2xl w-full">
              <OptionToggle title={dict.toggleProfile} description={dict.descProfile}
                active={formData.perms.profile} onChange={(v:boolean) => updatePerm('profile',v)}
              />
              <OptionToggle title={dict.toggleStats} description={dict.descStats}
                active={formData.perms.stats} onChange={(v:boolean) => updatePerm('stats',v)} disabled={!formData.perms.profile}
              />
              <OptionToggle title={dict.toggleFavs} description={dict.descFavs}
                active={formData.perms.favorites} onChange={(v:boolean) => updatePerm('favorites',v)} disabled={!formData.perms.profile}
              />
              <OptionToggle title={dict.toggleHistory} description={dict.descHistory}
                active={formData.perms.history} onChange={(v:boolean) => updatePerm('history',v)} disabled={!formData.perms.profile}
              />
              <OptionToggle title={dict.toggleDash} description={dict.descDash}
                active={formData.perms.dashboard} onChange={(v:boolean) => updatePerm('dashboard',v)} disabled={!formData.perms.profile}
              />
            </div>
          </div>

          {/* --- ACTIONS --- */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <button type="button" onClick={() => router.back()} className={PROFILE_EDIT_STYLES.BTN_CANCEL}>
              {dict.btnCancel}
            </button>
            <PrimaryButton onClick={handleSave} additional="px-6 py-2.5" disabled={hasError || saving}>
              {saving ? dict.saving : dict.btnSave}
            </PrimaryButton>
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