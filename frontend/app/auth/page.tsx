"use client";
import { TOAST_STYLE } from "@/app/constants/ui";
import { useEffect, useId, useState } from "react";
import { useAuth } from "../context/authContext";
import { useRouter, useSearchParams } from "next/navigation";
import { FRONT_ROUTES } from "../constants/routes";
import PublicRoute from "../components/auth/PublicRoute";
import { PrimaryButton } from "../components/Atomic/Buttons";
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
  INPUT_LABEL: `text3 text-[10px] uppercase font-bold ml-2`,
  INPUT_FIELD: `text1 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus:border-vert/50 outline-none transition-all focus:bg-white/10 placeholder:text-gray-700`,
  SEPARATOR_CONTAINER: "relative mb-8 text-center",
  SEPARATOR_LINE: "absolute inset-0 flex items-center",
  SEPARATOR_TEXT: `text3 relative px-4 bg-bg2 text-[9px] uppercase tracking-widest`,
  ERROR_BOX: "bg-rouge/10 border border-rouge/20 text-rouge text-[10px] p-3 rounded-xl animate-shake",
  SUCCESS_BOX: "bg-vert/10 border border-vert/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500",
  PRIMARY_BUTTON: `text1 w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-bold border border-white/5 mt-4 transition-all active:scale-[0.98]`,
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
      toast.success(dict.welcome, {
        style: TOAST_STYLE,
        iconTheme: { primary: '#1DD05D', secondary: '#fff' },
      });
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
          <SpotifyIcon/> {dict.connectwithspotify}
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
          <div className="space-y-1">
            <label htmlFor={`${uid}-login-email`} className={AUTH_STYLES.INPUT_LABEL}>{dict.emailtitle}</label>
            <input id={`${uid}-login-email`} className={AUTH_STYLES.INPUT_FIELD} autoComplete="username"
              value={loginData.email} placeholder={dict.templateemail} type="email"
              onChange={(e) => setLoginData({...loginData, email: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${uid}-login-pw`} className={AUTH_STYLES.INPUT_LABEL}>{dict.pw}</label>
            <input id={`${uid}-login-pw`} autoComplete="current-password" type="password" value={loginData.password} placeholder="••••••••"
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className={AUTH_STYLES.INPUT_FIELD}
            />
          </div>
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
          <div className="space-y-1">
            <label htmlFor={`${uid}-reg-username`} className={AUTH_STYLES.INPUT_LABEL}>{dict.username}</label>
            <input id={`${uid}-reg-username`} autoComplete="username" type="text" value={regData.username} placeholder={dict.placeholderUsername}
              aria-invalid={!!registerErrors.username} aria-describedby={registerErrors.username ? `${uid}-reg-username-err` : undefined}
              onChange={(e) => setRegData({...regData, username: e.target.value})}
              className={AUTH_STYLES.INPUT_FIELD}
            />
            {registerErrors.username && <p id={`${uid}-reg-username-err`} role="alert" className={AUTH_STYLES.FIELD_ERROR}>{registerErrors.username}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor={`${uid}-reg-email`} className={AUTH_STYLES.INPUT_LABEL}>{dict.emailtitle}</label>
            <input id={`${uid}-reg-email`} autoComplete="email" type="email" value={regData.email} placeholder={dict.templateemail}
              onChange={(e) => setRegData({...regData, email: e.target.value})}
              className={AUTH_STYLES.INPUT_FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor={`${uid}-reg-pw`} className={AUTH_STYLES.INPUT_LABEL}>{dict.pw}</label>
              <input id={`${uid}-reg-pw`} autoComplete="new-password" type="password" value={regData.password} placeholder="••••"
                aria-invalid={!!registerErrors.password} aria-describedby={registerErrors.password ? `${uid}-reg-pw-err` : undefined}
                onChange={(e) => setRegData({...regData, password: e.target.value})}
                className={AUTH_STYLES.INPUT_FIELD} 
              />
              {registerErrors.password && <p id={`${uid}-reg-pw-err`} role="alert" className={AUTH_STYLES.FIELD_ERROR}>{registerErrors.password}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor={`${uid}-reg-confirm`} className={AUTH_STYLES.INPUT_LABEL}>{dict.confirm}</label>
              <input id={`${uid}-reg-confirm`} autoComplete="new-password" type="password" value={regData.confirmPassword} placeholder="••••"
                aria-invalid={!!registerErrors.confirm} aria-describedby={registerErrors.confirm ? `${uid}-reg-confirm-err` : undefined}
                onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
                className={AUTH_STYLES.INPUT_FIELD}
              />
              {registerErrors.confirm && <p id={`${uid}-reg-confirm-err`} role="alert" className={AUTH_STYLES.FIELD_ERROR}>{registerErrors.confirm}</p>}
            </div>
          </div>

          <PrimaryButton disabled={loading} additional="mt-4 py-4 w-full sm:text-base">{loading ? dict.creating : dict.create}</PrimaryButton>
          <p className={AUTH_STYLES.FOOTER_TEXT}>{dict.littleNote}</p>
        </form>
      </>,
  }

  if (loading) return <SkeletonAuth/>;

  return (
    <DoubleFrame
      titles={[left_col.title,right_col.title]}
      subtitles={[left_col.subtitle,right_col.subtitle]}
      contents={[left_col.content,right_col.content]}
    />
  );
}

// --- ICONES ---
const SpotifyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.675.465-1.028.249-2.85-1.741-6.439-2.135-10.665-1.168-.404.093-.812-.16-.905-.565-.093-.404.16-.812.565-.905 4.625-1.057 8.586-.613 11.784 1.34.353.216.465.676.249 1.029zm1.467-3.262c-.271.441-.845.582-1.286.311-3.262-2.004-8.234-2.585-12.091-1.414-.497.151-1.024-.131-1.175-.628-.151-.498.132-1.024.629-1.175 4.407-1.338 9.893-.687 13.612 1.601.44.271.582.845.311 1.286zm.134-3.376C14.928 8.1 8.163 7.873 4.241 9.064c-.615.186-1.266-.165-1.452-.779-.186-.615.166-1.266.779-1.452 4.505-1.368 12.001-1.112 16.756 1.708.553.328.738 1.037.409 1.589-.328.552-1.037.738-1.589.409z"/>
  </svg>
);