"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { PrimaryButton, TertiaryButton } from "../components/Atomic/Buttons";
import { DoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";
import { Skeleton } from "./Skeleton";
import toast from "react-hot-toast";

export default function AccountPage() {
  return (
    <ProtectedRoute skeleton={<Skeleton/>}>
      <AccountContent/>
    </ProtectedRoute>
  );
}

const PROFILE_STYLES = {
  INPUT_LABEL: `text2 text-[10px] uppercase font-bold ml-2`,
  INPUT_FIELD: `text1 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus:border-vert/50 outline-none transition-all focus:bg-white/10`,
  BTN_SAVE: `text1 w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-bold border border-white/5 mt-4 transition-all`,
  SERVICE_CARD: (hasSpotify: boolean) => `p-6 rounded-[30px] border transition-all duration-500 ${hasSpotify ? 'bg-vert/5 border-vert/20' : 'bg-white/5 border-white/10'}`,
  SPOTIFY_ICON_BOX: (hasSpotify: boolean) => `p-4 rounded-2xl ${hasSpotify ? `bg-vert text4` : `text1 bg-white/10`}`,
  BADGE_SUCCESS: `text2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest rounded-xl justify-center`,
  BADGE_ERROR: "flex items-center gap-2 text-rouge text-[11px] font-bold uppercase tracking-widest rounded-xl justify-center",
  MESSAGE_CONTAINER: "mb-6 min-h-[45px] transition-all duration-300 ease-in-out",
  BADGE_ANIM: "animate-in fade-in slide-in-from-top-2 duration-300",
};

function AccountContent() {
  const { user, loading, updateUserProfile, deleteAccount, clearAccount, loginSpotify } = useAuth();
  const [username, setUsername] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {if (user?.user_name) setUsername(user.user_name)}, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updating) return;

    setUpdating(true);
    setMessage({ type: "", text: "" });

    try {
      await updateUserProfile(username);
      toast.success("Profil mis à jour avec succès !", {
        style: { borderRadius: '15px', background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        iconTheme: { primary: '#1DD05D', secondary: '#fff' },
      });
    } catch (err: any) {
      if (err.status === 422) setMessage({type: "error",text: "Votre pseudonyme doit faire au moins 3 caractères"});
      else setMessage({type: "error",text: err.message});
    } finally {setUpdating(false)}
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt("Pour confirmer la suppression de votre compte et de toutes vos statistiques, tapez 'SUPPRIMER' ci-dessous :");
    
    if (confirmation === "SUPPRIMER") {
      try {
        await deleteAccount();
        toast.success("Votre compte a été supprimé avec succès.", {
          style: { borderRadius: '15px', background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          iconTheme: { primary: '#1DD05D', secondary: '#fff' },
        });
      } catch (err) {toast.error("Erreur lors de la suppression.")}
    }
  };

  const handleClearAccount = async () => {
    const confirmation = prompt("Pour confirmer le nettoyage de vos données et de toutes vos statistiques, tapez 'CONFIRMER' ci-dessous :");
    
    if (confirmation === "CONFIRMER") {
      try {
        await clearAccount();
        toast.success("Vos données ont été supprimées avec succès.", {
          style: { borderRadius: '15px', background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          iconTheme: { primary: '#1DD05D', secondary: '#fff' },
        });
      } catch (err) {toast.error("Erreur lors de la suppression.")}
    }
  };

  if (!user || loading) return <Skeleton/>;

  const left_col = {
    title: 'Profil',
    subtitle: 'Gérez vos informations.',
    content:
      <>
        {/* ZONE DE MESSAGE (Feedback API) */}
        {message.text !== "" &&
          <div className={PROFILE_STYLES.MESSAGE_CONTAINER}>
            {message.text && (
              <div className={`
                ${message.type === "success" ? PROFILE_STYLES.BADGE_SUCCESS : PROFILE_STYLES.BADGE_ERROR}
                ${PROFILE_STYLES.BADGE_ANIM}
              `}>
                {message.type === "success" ? <CheckIcon/> : <CrossIcon/>}
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
      </>,
  }

  const right_col = {
    title: 'Services',
    subtitle: 'Liaison de comptes tiers.',
    content:
      <>
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
              <p className="text3 w-full py-3 text-[11px] font-bold uppercase tracking-widest">
                {user.spotify_email}
              </p>
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
        {/* Zone de danger : Suppression du compte */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center">
          <button onClick={handleClearAccount}
            className="group flex flex-col items-center gap-3 transition-all duration-300 hover:opacity-80 pb-8"
          >
            <div className="px-6 py-3 rounded-full border border-rouge/20 bg-rouge/5 text-rouge text-[11px] font-bold uppercase tracking-widest group-hover:bg-rouge group-hover:text-white transition-all">
              Nettoyer mes données
            </div>
          </button>

          <button onClick={handleDeleteAccount}
            className="group flex flex-col items-center gap-3 transition-all duration-300 hover:opacity-80"
          >
            <div className="px-6 py-3 rounded-full border border-rouge/20 bg-rouge/5 text-rouge text-[11px] font-bold uppercase tracking-widest group-hover:bg-rouge group-hover:text-white transition-all">
              Supprimer mon compte MyStats
            </div>
          </button>
          
          <p className="text3 text-[10px] text-center mt-8 leading-relaxed font-hias uppercase">
            Ces actions sont irréversibles. Toutes vos statistiques et données de profil seront définitivement effacées.
          </p>
        </div>
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