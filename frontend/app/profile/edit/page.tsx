"use client";

import { TOAST_SUCCESS_OPTIONS } from "@/app/constants/ui";
import { SITE_HOST } from "@/app/constants/app";
import { defaultAvatar } from "@/app/constants/images";
import { FRONT_ROUTES } from "@/app/constants/routes";
import { NAME_MIN, NAME_MAX, NAME_WARN, NAME_DANGER, BIO_MAX, BIO_WARN, BIO_DANGER, SLUG_WARN, SLUG_DANGER, SLUG_MAX, ALL_PERMS, type PermKey } from "@/app/constants/validation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { PrimaryButton } from "@/app/components/Atomic/Buttons";
import { useAuth } from "@/app/context/authContext";
import { useProfile } from "@/app/hooks/useProfile";
import toast from "react-hot-toast";
import { ProfileEditSkeleton } from "./Skeleton";
import { PrivacyToggles } from "./PrivacyToggles";
import { BannerEditor, AvatarEditor } from "./ProfileImages";
import { useImageUpload } from "./useImageUpload";
import { CharCounter } from "@/app/components/Atomic/CharCounter";
import { FormField } from "@/app/components/Atomic/FormField";
import { normalizeSlug, slugError } from "@/app/services/validation";
import { useLanguage } from "@/app/context/languageContext";
import { ErrorState } from "@/app/components/Atomic/Error/Error";
import { DEFAULT_BANNER, isDefaultBanner } from "@/app/constants/images";

export default function EditProfilePage() {
  return (
    <ProtectedRoute skeleton={<ProfileEditSkeleton/>}>
      <EditProfileContent/>
    </ProtectedRoute>
  );
}

// Marge gauche du champ : laisse la place au préfixe « hôte/profile/ » affiché devant
const SLUG_PREFIX_PADDING = `calc(${SITE_HOST.length + "/profile/".length}ch + 2rem)`;

const COUNTER_CLASS = "block text-xs mb-2 ml-1";

const PROFILE_EDIT_STYLES = {
  MAIN: "min-h-screen pb-20 bg-bg1",
  
  // Profile Header
  CONTAINER: "max-w-5xl mx-auto px-6 -mt-20 relative z-10",
  HEADER_FLEX: "flex flex-col md:flex-row items-center md:items-end gap-6",
  TEXT_GROUP: "flex-1 text-center md:text-left mb-4",
  TITLE: `text1 text-3xl font-bold mb-1`,
  SUBTITLE: `text3 text-sm`,

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
const ERROR_CLASS = `${PROFILE_EDIT_STYLES.LABEL} text-rouge text-[9px] pt-2`;

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
  const SLUG_ERRORS = { numeric: dict.errorSlugNumeric, reserved: dict.errorSlugReserved, length: dict.errorSlugLength, none: "" };
  const errors = {
    errorName: name.length < NAME_MIN ? errDict.errorName1 : name.length > NAME_MAX ? errDict.errorName2 : "",
    errorBio: bio.length > BIO_MAX ? dict.errorBio : "",
    errorSlug: SLUG_ERRORS[slugError(slug) ?? "none"],
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
      toast.success(dict.successToast, TOAST_SUCCESS_OPTIONS);
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

  const handleImageChange = useImageUpload(
    (key, dataUrl) => setFormData(prev => ({ ...prev, [key]: dataUrl })),
    dict,
  );

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
      <BannerEditor src={formData.banner_url} alt={t.a11y.banner} label={dict.changeBanner} onChange={handleImageChange("banner_url")}/>

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- ÉDITION AVATAR --- */}
        <div className={PROFILE_EDIT_STYLES.HEADER_FLEX}>
          <AvatarEditor src={formData.avatar_url} alt={t.a11y.avatarPreview} onChange={handleImageChange("avatar_url")}/>
          
          <div className={PROFILE_EDIT_STYLES.TEXT_GROUP}>
            <h1 className={PROFILE_EDIT_STYLES.TITLE}>{dict.title}</h1>
            <p className={PROFILE_EDIT_STYLES.SUBTITLE}>{dict.subtitle}</p>
          </div>
        </div>

        {/* --- FORMULAIRE --- */}
        <div className={PROFILE_EDIT_STYLES.FORM_CARD}>
          <FormField id="profile-name" className={PROFILE_EDIT_STYLES.FIELD_GROUP} label={dict.labelName} labelClassName={PROFILE_EDIT_STYLES.LABEL}
            counter={<CharCounter value={formData.display_name} max={NAME_MAX} min={NAME_MIN} warn={NAME_WARN} danger={NAME_DANGER} className={COUNTER_CLASS}/>}
            error={errors.errorName} errorClassName={ERROR_CLASS}
          >
            {(field) => (
              <input {...field} type="text" className={PROFILE_EDIT_STYLES.INPUT} value={formData.display_name}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, display_name: value }));
                }}
                placeholder={dict.placeholderName}
              />
            )}
          </FormField>

          <FormField id="profile-bio" className={PROFILE_EDIT_STYLES.FIELD_GROUP} label={dict.labelBio} labelClassName={PROFILE_EDIT_STYLES.LABEL}
            counter={<CharCounter value={formData.bio} max={BIO_MAX} warn={BIO_WARN} danger={BIO_DANGER} className={COUNTER_CLASS}/>}
            error={errors.errorBio} errorClassName={ERROR_CLASS}
          >
            {(field) => (
              <textarea {...field} rows={4} className={PROFILE_EDIT_STYLES.TEXTAREA}
                value={formData.bio} placeholder={dict.placeholderBio}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, bio: value }));
                }}
              />
            )}
          </FormField>

          <FormField id="profile-slug" className={PROFILE_EDIT_STYLES.FIELD_GROUP} label={dict.labelUrl} labelClassName={PROFILE_EDIT_STYLES.LABEL}
            counter={<CharCounter value={formData.slug} max={SLUG_MAX} warn={SLUG_WARN} danger={SLUG_DANGER} className={COUNTER_CLASS}/>}
            error={errors.errorSlug} errorClassName={ERROR_CLASS}
          >
            {(field) => (
              <>
                <div className="relative flex items-center">
                  {/* Préfixe de l'URL */}
                  <span className="absolute left-4 text-white/30 text-sm font-medium pointer-events-none">
                    {SITE_HOST}/profile/
                  </span>

                  <input {...field} type="text" className={`${PROFILE_EDIT_STYLES.INPUT} text-md tracking-wider`} style={{ paddingLeft: SLUG_PREFIX_PADDING }}
                    value={formData.slug || ""} placeholder={dict.placeholderUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: normalizeSlug(e.target.value) }))}
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-2 ml-1">{dict.urlHint}</p>
              </>
            )}
          </FormField>

          {/* --- RÉGLAGES PRIVAUTÉ --- */}
          <div className="flex flex-col justify-center mt-8">
            <p className={PROFILE_EDIT_STYLES.LABEL}>{dict.labelPrivacy}</p>
            <PrivacyToggles perms={formData.perms} onChange={updatePerm} dict={dict}/>
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
