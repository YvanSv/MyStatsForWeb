"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { FRONT_ROUTES } from "../constants/routes";
import PublicRoute from "../components/auth/PublicRoute";
import { PrimaryButton } from "../components/Atomic/Buttons";
import { DoubleFrame, SkeletonDoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";

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
  FOOTER_TEXT: `text3 text-[10px] text-center mt-4 leading-relaxed px-4`
};

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, loginSpotify } = useAuth();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState({ type: "", text: "" });
  const [registerMessage, setRegisterMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const registered = searchParams.get("registered");
    if (registered === "true") {
      setLoginMessage({ 
        type: "success", 
        text: "Compte créé avec succès ! Connectez-vous." 
      });
    }
  }, [searchParams]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginMessage({ type: "", text: "" });
    setRegisterMessage({ type: "", text: ""});

    try {
      await login(loginData.email, loginData.password);
      router.push(FRONT_ROUTES.ACCUEIL);
      router.refresh();
    } catch (err: any) {setLoginMessage({ type: "error", text: "Email ou mot de passe incorrect." })}
    finally {setLoading(false)}
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage({ type: "", text: "" });
    if (regData.password !== regData.confirmPassword)
      return setRegisterMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });

    setLoading(true);
    try {
      await register(regData.username, regData.email, regData.password);
      setRegisterMessage({ type: "success", text: "Inscription réussie !" });
    } catch (err: any) {setRegisterMessage({ type: "error", text: err.message || "Erreur lors de l'inscription." })}
    finally {setLoading(false)}
  };

  const left_col = {
    title: 'Connexion',
    subtitle: 'Bon retour sur MyStats.',
    content:
      <>
        <PrimaryButton onClick={loginSpotify} additional="sm:text-base w-full gap-3 mb-8 py-4">
          <SpotifyIcon/>Continuer avec Spotify
        </PrimaryButton>
        
        <div className={AUTH_STYLES.SEPARATOR_CONTAINER}>
          <div className={AUTH_STYLES.SEPARATOR_LINE}>
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className={AUTH_STYLES.SEPARATOR_TEXT}>Ou</span>
        </div>

        <form className="space-y-4" onSubmit={handleLoginSubmit}>
          {loginMessage.text && loginMessage.type === "error" && (
            <div className={AUTH_STYLES.ERROR_BOX}>{loginMessage.text}</div>
          )}
          <div className="space-y-1">
            <label className={AUTH_STYLES.INPUT_LABEL}>Email</label>
            <input 
              className={AUTH_STYLES.INPUT_FIELD}
              value={loginData.email} 
              onChange={(e) => setLoginData({...loginData, email: e.target.value})} 
              placeholder="votre@email.com" 
              type="email"
            />
          </div>
          <div className="space-y-1">
            <label className={AUTH_STYLES.INPUT_LABEL}>Mot de passe</label>
            <input 
              type="password" 
              value={loginData.password} 
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className={AUTH_STYLES.INPUT_FIELD} 
              placeholder="••••••••"
            />
          </div>
          <button disabled={loading} className={AUTH_STYLES.PRIMARY_BUTTON}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </>,
  }

  const right_col = {
    title: 'S\'inscrire',
    subtitle: 'Nouveau ici ? Bienvenue.',
    content:
      <>
        <form className="space-y-4" onSubmit={handleRegisterSubmit}>
          {registerMessage.text && (
            <div className={registerMessage.type === "success" ? AUTH_STYLES.SUCCESS_BOX : AUTH_STYLES.ERROR_BOX}>
              {registerMessage.text}
            </div>
          )}
          <div className="space-y-1">
            <label className={AUTH_STYLES.INPUT_LABEL}>Nom d'utilisateur</label>
            <input 
              type="text" 
              value={regData.username} 
              onChange={(e) => setRegData({...regData, username: e.target.value})}
              className={AUTH_STYLES.INPUT_FIELD} 
              placeholder="MusicFan_01"
            />
          </div>
          <div className="space-y-1">
            <label className={AUTH_STYLES.INPUT_LABEL}>Email</label>
            <input 
              type="email" 
              value={regData.email} 
              onChange={(e) => setRegData({...regData, email: e.target.value})}
              className={AUTH_STYLES.INPUT_FIELD} 
              placeholder="votre@email.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={AUTH_STYLES.INPUT_LABEL}>Mot de passe</label>
              <input 
                type="password" 
                value={regData.password} 
                onChange={(e) => setRegData({...regData, password: e.target.value})}
                className={AUTH_STYLES.INPUT_FIELD} 
                placeholder="••••"
              />
            </div>
            <div className="space-y-1">
              <label className={AUTH_STYLES.INPUT_LABEL}>Confirmation</label>
              <input 
                type="password" 
                value={regData.confirmPassword} 
                onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
                className={AUTH_STYLES.INPUT_FIELD} 
                placeholder="••••"
              />
            </div>
          </div>

          <div className="pt-4">
            <PrimaryButton disabled={loading} additional="py-4 w-full sm:text-base">
              {loading ? "Création..." : "Créer mon compte"}
            </PrimaryButton>
          </div>
          
          <p className={AUTH_STYLES.FOOTER_TEXT}>
            En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
          </p>
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

const SKELETON_STYLES = {
  PULSE: "animate-pulse bg-white/5 rounded-2xl h-12 w-full",
  TEXT_SM: "h-3 bg-white/5 rounded animate-pulse",
};

function SkeletonAuth() {
  const contents = [
    <>
      <div className="h-14 w-full bg-vert/10 rounded-full animate-pulse" />
      
      <div className="relative py-4">
          <div className="w-full border-t border-white/5" />
      </div>

      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className={`w-16 ml-2 ${SKELETON_STYLES.TEXT_SM}`} />
            <div className={SKELETON_STYLES.PULSE}/>
          </div>
        ))}
        <div className="h-14 w-full bg-white/10 rounded-2xl animate-pulse mt-4" />
      </div>
    </>,
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className={`w-24 ml-2 ${SKELETON_STYLES.TEXT_SM}`} />
          <div className={SKELETON_STYLES.PULSE}/>
        </div>
      ))}
      
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="space-y-2">
            <div className={`w-20 ml-2 ${SKELETON_STYLES.TEXT_SM}`} />
            <div className={SKELETON_STYLES.PULSE}/>
          </div>
        ))}
      </div>

      <div className="h-14 w-full bg-vert/10 rounded-2xl animate-pulse mt-6" />
      <div className={`w-3/4 mx-auto mt-4 ${SKELETON_STYLES.TEXT_SM}`} />
    </div>
  ]
  return <SkeletonDoubleFrame contents={contents}/>;
}

// --- ICONES ---
const SpotifyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.675.465-1.028.249-2.85-1.741-6.439-2.135-10.665-1.168-.404.093-.812-.16-.905-.565-.093-.404.16-.812.565-.905 4.625-1.057 8.586-.613 11.784 1.34.353.216.465.676.249 1.029zm1.467-3.262c-.271.441-.845.582-1.286.311-3.262-2.004-8.234-2.585-12.091-1.414-.497.151-1.024-.131-1.175-.628-.151-.498.132-1.024.629-1.175 4.407-1.338 9.893-.687 13.612 1.601.44.271.582.845.311 1.286zm.134-3.376C14.928 8.1 8.163 7.873 4.241 9.064c-.615.186-1.266-.165-1.452-.779-.186-.615.166-1.266.779-1.452 4.505-1.368 12.001-1.112 16.756 1.708.553.328.738 1.037.409 1.589-.328.552-1.037.738-1.589.409z"/>
  </svg>
);