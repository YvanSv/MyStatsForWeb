"use client";
import { INPUT_BASE, INPUT_LABEL_BASE, BTN_BASE, TOAST_SUCCESS_OPTIONS } from "@/app/constants/ui";
import { useEffect, useId, useState } from "react";
import { useAuth } from "../context/authContext";
import { useRouter, useSearchParams } from "next/navigation";
import { FRONT_ROUTES } from "../constants/routes";
import PublicRoute from "../components/auth/PublicRoute";
import { PrimaryButton } from "../components/Atomic/Buttons";
import { FormField } from "../components/Atomic/FormField";
import { SpotifyIcon } from "../components/Atomic/Icons";
import { DoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";
import { SkeletonAuth } from "./Skeleton";
import toast from "react-hot-toast";
import { useLanguage } from "../context/languageContext";

export default function AuthPage() {
  return (
    <PublicRoute skeleton={<SkeletonAuth/>}>
      <AuthContent/>
    </PublicRoute>
  );
}

const AUTH_STYLES = {
  INPUT_LABEL: `text3 ${INPUT_LABEL_BASE}`,
  INPUT_FIELD: `${INPUT_BASE} placeholder:text-gray-700`,
  SEPARATOR_CONTAINER: "relative mb-8 text-center",
  SEPARATOR_LINE: "absolute inset-0 flex items-center",
  SEPARATOR_TEXT: `text3 relative px-4 bg-bg2 text-[9px] uppercase tracking-widest`,
  ERROR_BOX: "bg-rouge/10 border border-rouge/20 text-rouge text-[10px] p-3 rounded-xl animate-shake",
  SUCCESS_BOX: "bg-vert/10 border border-vert/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500",
  PRIMARY_BUTTON: `${BTN_BASE} active:scale-[0.98]`,
  FIELD_ERROR: "text-rouge text-[10px] pt-1",
  FOOTER_TEXT: `text3 text-[10px] text-center mt-4 leading-relaxed px-4`
};

function AuthContent() {
  const router = useRouter();
  const uid = useId();
  const searchParams = useSearchParams();
  const { login, register, loginSpotify } = useAuth();
  const { t } = useLanguage();
  const dict = t.auth;
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState({ type: "", text: "" });
  const [registerMessage, setRegisterMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const errorMap: Record<string, string> = {
        "spotify_cancelled": dict.spotifyError1,
        // Code renvoyé tel quel par Spotify quand l'utilisateur annule l'autorisation
        "access_denied": dict.spotifyError1,
        "spotify_token_error": dict.spotifyError2,
        "spotify_profile_error": dict.spotifyError3,
        "missing_code": dict.spotifyError4
      };
      
      setLoginMessage({ 
        type: "error", 
        text: errorMap[error] || `${dict.spotifyErrorTemplate} : ${error}` 
      });

      // Nettoie l'URL sans recharger la page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [searchParams, dict]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setLoginMessage({ type: "", text: "" });

    try {
      await login(loginData.email, loginData.password);
      router.push(FRONT_ROUTES.ACCUEIL);
      router.refresh();
    } catch (err) {
      // Utilise le message extrait par ApiError (ex: "Email ou mot de passe incorrect")
      setLoginMessage({ 
        type: "error", 
        text: (err instanceof Error && err.message) || dict.errorOccured 
      });
    } finally {setLoading(false)}
  };

  // Erreurs d'inscription calculées à partir des valeurs saisies (mêmes limites que le serveur : pseudo 3 à 20, mot de passe 8 à 128).
  // Un champ vide n'affiche pas d'erreur tant qu'on ne valide pas le formulaire.
  const registerErrors = {
    username: regData.username === "" ? "" : regData.username.trim().length < 3 ? dict.errorUsernameMin : regData.username.trim().length > 20 ? dict.errorUsernameMax : "",
    password: regData.password === "" ? "" : regData.password.length < 8 ? dict.errorPw1 : regData.password.length > 128 ? dict.errorPwMax : "",
    confirm: regData.confirmPassword !== "" && regData.confirmPassword !== regData.password ? dict.errorPw3 : "",
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setRegisterMessage({ type: "", text: "" });

    if (!regData.username.trim() || !regData.email.trim() || !regData.password || !regData.confirmPassword)
      return setRegisterMessage({ type: "error", text: dict.errorRequired });
    const firstError = registerErrors.username || registerErrors.password || registerErrors.confirm;
    if (firstError) return setRegisterMessage({ type: "error", text: firstError });
    if (regData.password !== regData.confirmPassword)
      return setRegisterMessage({ type: "error", text: dict.errorPw3 });

    setLoading(true);
    try {
      await register(regData.username, regData.email, regData.password);
      toast.success(dict.welcome, TOAST_SUCCESS_OPTIONS);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 422) setRegisterMessage({type: "error",text: dict.errorRegisterInvalid});
      else if (status === 400) setRegisterMessage({type: "error",text: err instanceof Error ? err.message : dict.errorPw2});
      else setRegisterMessage({type: "error",text: dict.errorPw2});
    } finally {setLoading(false)}
  };

  const left_col = {
    title: dict.connecttitle,
    subtitle: dict.comeback,
    content:
      <>
        <PrimaryButton onClick={loginSpotify} additional="sm:text-base w-full gap-3 mb-8 py-4">
          <SpotifyIcon size={20}/> {dict.connectwithspotify}
        </PrimaryButton>
        
        <div className={AUTH_STYLES.SEPARATOR_CONTAINER}>
          <div className={AUTH_STYLES.SEPARATOR_LINE}>
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className={AUTH_STYLES.SEPARATOR_TEXT}>{dict.ou}</span>
        </div>

        <form className="space-y-4" onSubmit={handleLoginSubmit}>
          {loginMessage.text && loginMessage.type === "error" && (
            <div className={AUTH_STYLES.ERROR_BOX}>{loginMessage.text}</div>
          )}
          <FormField id={`${uid}-login-email`} label={dict.emailtitle} labelClassName={AUTH_STYLES.INPUT_LABEL}>
            {(field) => (
              <input {...field} className={AUTH_STYLES.INPUT_FIELD} autoComplete="username"
                value={loginData.email} placeholder={dict.templateemail} type="email"
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
              />
            )}
          </FormField>
          <FormField id={`${uid}-login-pw`} label={dict.pw} labelClassName={AUTH_STYLES.INPUT_LABEL}>
            {(field) => (
              <input {...field} autoComplete="current-password" type="password" value={loginData.password} placeholder="••••••••"
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className={AUTH_STYLES.INPUT_FIELD}
              />
            )}
          </FormField>
          <button disabled={loading} className={AUTH_STYLES.PRIMARY_BUTTON}>{loading ? dict.connecting : dict.connect}</button>
        </form>
      </>,
  }

  const right_col = {
    title: dict.righttitle,
    subtitle: dict.rightsubtitle,
    content:
      <>
        <form className="space-y-4" onSubmit={handleRegisterSubmit}>
          {registerMessage.text && (
            <div className={registerMessage.type === "success" ? AUTH_STYLES.SUCCESS_BOX : AUTH_STYLES.ERROR_BOX}>
              {registerMessage.text}
            </div>
          )}
          <FormField id={`${uid}-reg-username`} label={dict.username} labelClassName={AUTH_STYLES.INPUT_LABEL}
            error={registerErrors.username} errorClassName={AUTH_STYLES.FIELD_ERROR}
          >
            {(field) => (
              <input {...field} autoComplete="username" type="text" value={regData.username} placeholder={dict.placeholderUsername}
                onChange={(e) => setRegData({...regData, username: e.target.value})}
                className={AUTH_STYLES.INPUT_FIELD}
              />
            )}
          </FormField>
          <FormField id={`${uid}-reg-email`} label={dict.emailtitle} labelClassName={AUTH_STYLES.INPUT_LABEL}>
            {(field) => (
              <input {...field} autoComplete="email" type="email" value={regData.email} placeholder={dict.templateemail}
                onChange={(e) => setRegData({...regData, email: e.target.value})}
                className={AUTH_STYLES.INPUT_FIELD}
              />
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id={`${uid}-reg-pw`} label={dict.pw} labelClassName={AUTH_STYLES.INPUT_LABEL}
              error={registerErrors.password} errorClassName={AUTH_STYLES.FIELD_ERROR}
            >
              {(field) => (
                <input {...field} autoComplete="new-password" type="password" value={regData.password} placeholder="••••"
                  onChange={(e) => setRegData({...regData, password: e.target.value})}
                  className={AUTH_STYLES.INPUT_FIELD}
                />
              )}
            </FormField>
            <FormField id={`${uid}-reg-confirm`} label={dict.confirm} labelClassName={AUTH_STYLES.INPUT_LABEL}
              error={registerErrors.confirm} errorClassName={AUTH_STYLES.FIELD_ERROR}
            >
              {(field) => (
                <input {...field} autoComplete="new-password" type="password" value={regData.confirmPassword} placeholder="••••"
                  onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
                  className={AUTH_STYLES.INPUT_FIELD}
                />
              )}
            </FormField>
          </div>

          <PrimaryButton disabled={loading} additional="mt-4 py-4 w-full sm:text-base">{loading ? dict.creating : dict.create}</PrimaryButton>
          <p className={AUTH_STYLES.FOOTER_TEXT}>{dict.littleNote}</p>
        </form>
      </>,
  }

  return (
    <DoubleFrame
      titles={[left_col.title,right_col.title]}
      subtitles={[left_col.subtitle,right_col.subtitle]}
      contents={[left_col.content,right_col.content]}
    />
  );
}
