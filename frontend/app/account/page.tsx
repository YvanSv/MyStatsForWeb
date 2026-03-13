"use client";

import { useEffect, useState } from "react";
import { GENERAL_STYLES } from "../styles/general";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { PrimaryButton, TertiaryButton } from "../components/Atomic/Buttons";

export default function AccountPage() {
  return (
    <ProtectedRoute skeleton={<SkeletonAccount/>}>
      <AccountContent/>
    </ProtectedRoute>
  );
}

const PROFILE_STYLES = {
  WRAPPER: "min-h-[80vh] flex items-center justify-center",
  CARD: "w-full m-3 max-w-6xl bg-bg2/40 backdrop-blur-2xl border border-white/5 rounded-[40px] shadow-2xl overflow-hidden",
  CONTAINER_FLEX: "flex flex-col lg:flex-row",
  COL_LEFT: "flex-1 p-8 md:p-12 lg:p-16",
  COL_RIGHT: "flex-1 p-8 md:p-12 lg:p-16 bg-white/[0.02] flex flex-col",
  HEADER_SECTION: "mb-5 lg:mb-10",
  TITLE: `${GENERAL_STYLES.TITRE_DOUBLE_FRAME}`,
  SUBTITLE: `text3 text-md tracking-[0.2em] font-medium`,
  INPUT_LABEL: `text2 text-[10px] uppercase font-bold ml-2`,
  INPUT_FIELD: `text1 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus:border-vert/50 outline-none transition-all focus:bg-white/10`,
  BTN_SAVE: `text1 w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-bold border border-white/5 mt-4 transition-all`,
  SEPARATOR: "hidden lg:flex flex-col items-center justify-center",
  SEPARATOR_LINE: "w-[1px] h-3/4 bg-gradient-to-b from-transparent via-white/10 to-transparent",
  SERVICE_CARD: (hasSpotify: boolean) => `p-6 rounded-[30px] border transition-all duration-500 ${hasSpotify ? 'bg-vert/5 border-vert/20' : 'bg-white/5 border-white/10'}`,
  SPOTIFY_ICON_BOX: (hasSpotify: boolean) => `p-4 rounded-2xl ${hasSpotify ? `bg-vert text4` : `text1 bg-white/10`}`,
  BADGE_SUCCESS: `text2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest rounded-xl justify-center`,
  BADGE_ERROR: "flex items-center gap-2 text-rouge text-[11px] font-bold uppercase tracking-widest rounded-xl justify-center",
  BTN_UNLINK: `text3 w-full bg-white/5 hover:bg-rouge/10 hover:text-rouge hover:border-rouge/20 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/10 active:scale-95 transition-all`,
  SKELETON: "animate-pulse bg-white/5 rounded-2xl",
  MESSAGE_CONTAINER: "mb-6 min-h-[45px] transition-all duration-300 ease-in-out",
  BADGE_ANIM: "animate-in fade-in slide-in-from-top-2 duration-300",
};

function AccountContent() {
  const { user, loading, updateUserProfile, unlinkSpotify, loginSpotify } = useAuth();
  const [username, setUsername] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user?.user_name) setUsername(user.user_name)
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    if (updating) return;
    e.preventDefault();
    setUpdating(true);
    try {
      await updateUserProfile(username);
      setMessage({ type: "success", text: "Profil mis à jour partout !" });
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde" });
    } finally {
      setUpdating(false);
    }
  };

  if (!user)
    if (loading) return <SkeletonAccount/>;
    else return <></>;

  return (
    <div className={PROFILE_STYLES.WRAPPER}>
      <div className={PROFILE_STYLES.CARD}>
        <div className={PROFILE_STYLES.CONTAINER_FLEX}>
          {/* COLONNE GAUCHE : INFOS PERSO */}
          <div className={PROFILE_STYLES.COL_LEFT}>
            <div className={PROFILE_STYLES.HEADER_SECTION}>
              <h1 className={`${PROFILE_STYLES.TITLE}`}>Profil</h1>
              <p className={PROFILE_STYLES.SUBTITLE}>Gérez vos informations.</p>
            </div>

            {/* ZONE DE MESSAGE (Feedback API) */}
            {message.text !== "" &&
              <div className={PROFILE_STYLES.MESSAGE_CONTAINER}>
                {message.text && (
                  <div className={`
                    ${message.type === "success" ? PROFILE_STYLES.BADGE_SUCCESS : PROFILE_STYLES.BADGE_ERROR}
                    ${PROFILE_STYLES.BADGE_ANIM}
                  `}>
                    {message.type === "success" ? <CheckIcon /> : <CrossIcon />}
                    <span className="ml-1">{message.text}</span>
                  </div>
                )}
              </div>
            }

            <div className="space-y-6">
              {/* Champ Nom */}
              <div className="space-y-1">
                <label className={PROFILE_STYLES.INPUT_LABEL}>Nom d'affichage</label>
                <input className={PROFILE_STYLES.INPUT_FIELD} value={username ?? ""} 
                  onChange={(e) => setUsername(e.target.value)} type="text" 
                  placeholder="Ton pseudo..."
                />
              </div>

              {/* Champ Email */}
              <div className="space-y-1">
                <label className={PROFILE_STYLES.INPUT_LABEL}>Email (non modifiable)</label>
                <input value={user?.email ?? ""} disabled
                  className={`${PROFILE_STYLES.INPUT_FIELD} opacity-50 cursor-not-allowed`}/>
              </div>

              {/* Bouton Enregistrer avec état de chargement */}
              <button onClick={handleSave} disabled={updating || !username || username === user?.user_name}
                className={`${PROFILE_STYLES.BTN_SAVE} disabled:opacity-50 transition-all ${updating || !username || username === user?.user_name ? 'cursor-not-allowed active:scale-100' : 'cursor-pointer'}`}
              >
                {updating ? (
                  <span className="flex items-center justify-center gap-2">
                    Enregistrement...
                  </span>
                ) : "Enregistrer les modifications"}
              </button>
            </div>
          </div>

          <div className={PROFILE_STYLES.SEPARATOR}>
            <div className={PROFILE_STYLES.SEPARATOR_LINE}/>
          </div>

          {/* COLONNE DROITE : SERVICES */}
          <div className={PROFILE_STYLES.COL_RIGHT}>
            <div className={PROFILE_STYLES.HEADER_SECTION}>
              <>
                <h2 className={PROFILE_STYLES.TITLE}>Services</h2>
                <p className={PROFILE_STYLES.SUBTITLE}>Liaison de comptes tiers.</p>
              </>
            </div>

            <div className={PROFILE_STYLES.SERVICE_CARD(user.has_spotify)}>
              <div className="flex items-center gap-5 mb-6">
                <div className={PROFILE_STYLES.SPOTIFY_ICON_BOX(user.has_spotify)}>
                  <SpotifyIcon />
                </div>
                <div>
                  <h3 className={`text1 font-bold text-lg`}>Spotify</h3>
                  {user.has_spotify ?
                    <div className={PROFILE_STYLES.BADGE_SUCCESS}>
                      <CheckIcon/> Votre compte est synchronisé
                    </div>
                    :
                    <div className={PROFILE_STYLES.BADGE_ERROR}>
                      <CrossIcon/> Non synchronisé
                    </div>
                  }
                </div>
              </div>

              {user.has_spotify ? (
                <div className="space-y-4">
                  <TertiaryButton onClick={unlinkSpotify}
                    additional="text3 w-full hover:text-rouge hover:bg-rouge/10 hover:border-rouge/20 py-3 text-[10px] font-bold uppercase tracking-widest"
                  >Délier mon compte Spotify</TertiaryButton>
                </div>
              ) : (
                <PrimaryButton onClick={loginSpotify} additional="w-full py-4 sm:rounded-2xl">
                  Lier mon compte Spotify
                </PrimaryButton>
              )}
            </div>

            {/* Note en bas */}
            <p className={`text3 text-[10px] text-center mt-8 leading-relaxed font-hias uppercase tracking-tighter`}>
              La liaison Spotify permet à MyStats de récupérer vos écoutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonAccount() {
  return (
    <div className={PROFILE_STYLES.WRAPPER}>
      <div className={PROFILE_STYLES.CARD}>
        <div className={PROFILE_STYLES.CONTAINER_FLEX}>
          {/* COLONNE GAUCHE : INFOS PERSO */}
          <div className={PROFILE_STYLES.COL_LEFT}>
            <div className={PROFILE_STYLES.HEADER_SECTION}>
              <div className="space-y-3">
                <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-4 w-48 bg-white/5 rounded-lg animate-pulse" />
              </div>
            </div>

            <div className="space-y-6">
              {/* Champ Nom */}
              <div className="space-y-1">
                <div className={`h-12 w-full ${PROFILE_STYLES.SKELETON}`}/>
              </div>
              {/* Champ Email */}
              <div className="space-y-1">
                <div className={`h-12 w-full ${PROFILE_STYLES.SKELETON}`}/>
              </div>
              <div className="h-14 w-full bg-white/10 rounded-2xl animate-pulse mt-4"/>
            </div>
          </div>

          <div className={PROFILE_STYLES.SEPARATOR}>
            <div className={PROFILE_STYLES.SEPARATOR_LINE}/>
          </div>

          {/* COLONNE DROITE : SERVICES */}
          <div className={PROFILE_STYLES.COL_RIGHT}>
            <div className={PROFILE_STYLES.HEADER_SECTION}>
              <div className="space-y-3">
                <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse"/>
                <div className="h-4 w-48 bg-white/5 rounded-lg animate-pulse"/>
              </div>
            </div>
            <div className="h-48 w-full bg-white/5 rounded-[30px] border border-white/5 animate-pulse"/>
            {/* Note en bas */}
            <div className="mt-8 space-y-2">
              <div className="h-2 w-full bg-white/5 rounded animate-pulse"/>
              <div className="h-2 w-2/3 mx-auto bg-white/5 rounded animate-pulse"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ICONES ---

const SpotifyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.675.465-1.028.249-2.85-1.741-6.439-2.135-10.665-1.168-.404.093-.812-.16-.905-.565-.093-.404.16-.812.565-.905 4.625-1.057 8.586-.613 11.784 1.34.353.216.465.676.249 1.029zm1.467-3.262c-.271.441-.845.582-1.286.311-3.262-2.004-8.234-2.585-12.091-1.414-.497.151-1.024-.131-1.175-.628-.151-.498.132-1.024.629-1.175 4.407-1.338 9.893-.687 13.612 1.601.44.271.582.845.311 1.286zm.134-3.376C14.928 8.1 8.163 7.873 4.241 9.064c-.615.186-1.266-.165-1.452-.779-.186-.615.166-1.266.779-1.452 4.505-1.368 12.001-1.112 16.756 1.708.553.328.738 1.037.409 1.589-.328.552-1.037.738-1.589.409z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CrossIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);