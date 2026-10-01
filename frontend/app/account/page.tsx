"use client";
import { TOAST_STYLE } from "@/app/constants/ui";
import { NAME_MIN, NAME_MAX, NAME_WARN, NAME_DANGER, PASSWORD_MIN, PASSWORD_MAX, PASSWORD_WARN, PASSWORD_DANGER } from "@/app/constants/validation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/authContext";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { PrimaryButton } from "../components/Atomic/Buttons";
import { DoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";
import { ConfirmDialog } from "../components/Atomic/ConfirmDialog/ConfirmDialog";
import { Skeleton } from "./Skeleton";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../context/languageContext";

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
  const { t } = useLanguage();
  const dict = t.account;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  // Confirmation en cours (suppression ou nettoyage) et exécution de l'action
  const [dialog, setDialog] = useState<"delete" | "clear" | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  // Erreurs calculées à chaque rendu à partir des valeurs saisies (jamais stockées) : elles ne peuvent pas être périmées,
  // quel que soit le champ modifié en dernier ou l'ordre des mises à jour.
  const nameChanged = username !== (user?.user_name ?? "");
  const errors = {
    errorName: !nameChanged ? "" : username.length < NAME_MIN ? dict.errorName1 : username.length > NAME_MAX ? dict.errorName2 : "",
    errorPw: password !== "" && password.length < PASSWORD_MIN ? dict.errorPw1 : password.length > PASSWORD_MAX ? dict.errorPw2 : "",
    errorConfirmPw: password !== confirmPassword ? dict.errorPw3 : "",
  };
  // Erreur renvoyée par l'API lors de l'enregistrement (ex : email déjà utilisé)
  const [errorApi, setErrorApi] = useState('');

  // Les champs reprennent les valeurs enregistrées, sans jamais écraser une saisie en cours :
  // un champ n'est mis à jour que s'il n'a pas été modifié depuis la dernière synchronisation,
  // et seulement quand la valeur enregistrée change (un nouvel objet `user` identique ne fait rien).
  const synced = useRef({ name: "", email: "" });
  const savedName = user?.user_name ?? "";
  const savedEmail = user?.email ?? "";
  useEffect(() => {
    // Copie des anciennes valeurs : les fonctions de mise à jour s'exécutent plus tard, après la réaffectation ci-dessous
    const previous = synced.current;
    setUsername(current => current === previous.name ? savedName : current);
    setEmail(current => current === previous.email ? savedEmail : current);
    synced.current = { name: savedName, email: savedEmail };
  }, [savedName, savedEmail]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updating) return;
    if (errors.errorPw !== "" || errors.errorName !== "" || errors.errorConfirmPw !== "") return;

    setUpdating(true);
    setErrorApi('');

    try {
      const updateData: Record<string, string> = {};
      if (username !== user?.user_name) updateData.username = username;
      if (email !== user?.email) updateData.email = email;
      if (password) updateData.password = password;
      // Rien n'a changé : pas de requête inutile ni de faux message de succès
      if (Object.keys(updateData).length === 0) {
        toast(dict.noChanges);
        return;
      }
      await updateUserProfile(updateData);
      toast.success(dict.successToast, {
        style: TOAST_STYLE,
        iconTheme: { primary: '#1DD05D', secondary: '#fff' },
      });
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : dict.errorDeleteMessage);
    } finally {setUpdating(false)}
  };

  const toastStyle = {
    style: TOAST_STYLE,
    iconTheme: { primary: '#1DD05D', secondary: '#fff' },
  };

  // Exécute l'action irréversible une fois la saisie de confirmation validée par la fenêtre
  const runDangerAction = async (kind: "delete" | "clear") => {
    setDangerBusy(true);
    try {
      if (kind === "delete") await deleteAccount();
      else await clearAccount();
      toast.success(kind === "delete" ? dict.successDeleteToast : dict.successToastClear, toastStyle);
    } catch {toast.error(dict.errorDeleteMessage)}
    finally {
      setDangerBusy(false);
      setDialog(null);
    }
  };

  if (!user || loading) return <Skeleton/>;

  const left_col = {
    title: dict.lefttitle,
    subtitle: dict.leftsubtitle,
    content:
      <>
        <div className="space-y-6">
          {/* Champ Nom */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="account-name" className={PROFILE_STYLES.INPUT_LABEL}>{dict.titleDisplayname}</label>
              <p className={`${PROFILE_STYLES.INPUT_LABEL}
                ${(username || "").length < NAME_MIN ? 'text-rouge' : (username || "").length > NAME_WARN ? (username.length > NAME_DANGER ? (username.length >= NAME_MAX ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(username?.length || 0)}/{NAME_MAX}</p>
            </div>
            <input id="account-name" className={PROFILE_STYLES.INPUT_FIELD} value={username ?? ""} 
              aria-invalid={!!errors.errorName} aria-describedby={errors.errorName ? "account-name-err" : undefined}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              placeholder={dict.placeholderName}
            />
            {errors.errorName && (<p id="account-name-err" role="alert" className={`${PROFILE_STYLES.INPUT_LABEL} block text-rouge text-[9px] pt-2`}>{errors.errorName}</p>)}
          </div>

          {/* Champ Email */}
          <div className="space-y-1">
            <label htmlFor="account-email" className={PROFILE_STYLES.INPUT_LABEL}>{dict.emailtitle}</label>
            <input id="account-email" value={email} className={`${PROFILE_STYLES.INPUT_FIELD}`} onChange={e => setEmail(e.target.value)}/>
          </div>

          <hr className="border-white/5 my-4" />

          {/* Champ Mot de Passe */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="account-pw" className={PROFILE_STYLES.INPUT_LABEL}>{dict.passwordtitle}</label>
              <p className={`${PROFILE_STYLES.INPUT_LABEL}
                ${(password || "").length < PASSWORD_MIN ? 'text-rouge' : (password || "").length > PASSWORD_WARN ? (password.length > PASSWORD_DANGER ? (password.length >= PASSWORD_MAX ? 'text-rouge' : 'text-orange') : 'text-jaune') : 'text2'}`}
              >{(password?.length || 0)}/{PASSWORD_MAX}</p>
            </div>
            
            <div className="relative">
              <input id="account-pw" aria-invalid={!!errors.errorPw} aria-describedby={errors.errorPw ? "account-pw-err" : undefined} className={`${PROFILE_STYLES.INPUT_FIELD} pr-10`} value={password} type={showPassword ? "text" : "password"}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={dict.placeholderPw}
              />
              
              {/* Bouton Toggle Eye */}
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? dict.hidePassword : dict.showPassword} aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >{showPassword ? (<EyeOff size={16}/>) : (<Eye size={16}/>)}</button>
            </div>

            {errors.errorPw && (
              <p id="account-pw-err" role="alert" className={`${PROFILE_STYLES.INPUT_LABEL} block text-rouge text-[9px] pt-2`}>
                {errors.errorPw}
              </p>
            )}
          </div>

          {/* Champ Confirmation */}
          <div className="space-y-1">
            <label htmlFor="account-confirm" className={PROFILE_STYLES.INPUT_LABEL}>{dict.confirmpwtitle}</label>
            <div className="relative">
              <input id="account-confirm" aria-invalid={!!errors.errorConfirmPw} aria-describedby={errors.errorConfirmPw ? "account-confirm-err" : undefined} value={confirmPassword} placeholder={dict.placeholderpwc} type={showConfirmPassword ? "text" : "password"}
                className={`${PROFILE_STYLES.INPUT_FIELD} pr-10 ${password && confirmPassword && password !== confirmPassword ? 'border-red-500/50' : ''}`}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? dict.hidePassword : dict.showPassword} aria-pressed={showConfirmPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors focus:outline-none"
              >{showConfirmPassword ? (<EyeOff size={16}/>) : (<Eye size={16}/>)}</button>
            </div>

            {errors.errorConfirmPw && (
              <p id="account-confirm-err" role="alert" className={`${PROFILE_STYLES.INPUT_LABEL} block text-rouge text-[9px] pt-2 animate-pulse`}>
                {errors.errorConfirmPw}
              </p>
            )}
          </div>

          {/* Bouton Enregistrer avec état de chargement */}
          <button type="button" onClick={handleSave} disabled={updating || !username || errors.errorName !== "" || errors.errorPw !== "" || errors.errorConfirmPw !== ""}
            className={`${PROFILE_STYLES.BTN_SAVE} disabled:opacity-50 transition-all ${updating || !username || errors.errorName !== "" || errors.errorPw !== "" || errors.errorConfirmPw !== "" ? 'cursor-not-allowed active:scale-100' : 'cursor-pointer'}`}
          >
            {updating ? (
              <span className="flex items-center justify-center gap-2">
                {dict.saving}
              </span>
            ) : dict.save}
          </button>
          {errorApi && (<p role="alert" className={`${PROFILE_STYLES.INPUT_LABEL} text-rouge text-[9px] block text-center`}>{errorApi}</p>)}
        </div>
      </>,
  }

  const right_col = {
    title: dict.righttitle,
    subtitle: dict.rightsubtitle,
    content:
      <>
        <div className={PROFILE_STYLES.SERVICE_CARD(user.providers.SPOTIFY.has)}>
          <div className="flex items-center gap-5 mb-6">
            <div className={PROFILE_STYLES.SPOTIFY_ICON_BOX(user.providers.SPOTIFY.has)}>
              <SpotifyIcon />
            </div>
            <div>
              <h3 className={`text1 font-bold text-lg`}>Spotify</h3>
              {user.providers.SPOTIFY.has ?
                <div className={PROFILE_STYLES.BADGE_SUCCESS}>
                  <CheckIcon/> {dict.synchronized}
                </div>
                :
                <div className={PROFILE_STYLES.BADGE_ERROR}>
                  <CrossIcon/> {dict.notsynchronized}
                </div>
              }
            </div>
          </div>

          {user.providers.SPOTIFY.has ? (
            <div className="space-y-4">
              <p className="text3 w-full py-3 text-[11px] font-bold uppercase tracking-widest">
                {user.providers.SPOTIFY.email}
              </p>
            </div>
          ) : (
            <PrimaryButton onClick={loginSpotify} additional="w-full py-4 sm:rounded-2xl">
              {dict.linkSpotify}
            </PrimaryButton>
          )}
        </div>
        {/* Note en bas */}
        <p className={`text3 text-[10px] text-center mt-8 leading-relaxed font-hias uppercase tracking-tighter`}>
          {dict.littleNote}
        </p>
        {/* Zone de danger : Suppression du compte */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center">
          <button type="button" onClick={() => setDialog("clear")}
            className="group flex flex-col items-center gap-3 transition-all duration-300 hover:opacity-80 pb-8"
          >
            <div className="px-6 py-3 rounded-full border border-rouge/20 bg-rouge/5 text-rouge text-[11px] font-bold uppercase tracking-widest group-hover:bg-rouge group-hover:text-white transition-all">
              {dict.cleardata}
            </div>
          </button>

          <button type="button" onClick={() => setDialog("delete")}
            className="group flex flex-col items-center gap-3 transition-all duration-300 hover:opacity-80"
          >
            <div className="px-6 py-3 rounded-full border border-rouge/20 bg-rouge/5 text-rouge text-[11px] font-bold uppercase tracking-widest group-hover:bg-rouge group-hover:text-white transition-all">
              {dict.deleteaccount}
            </div>
          </button>
          
          <p className="text3 text-[10px] text-center mt-8 leading-relaxed font-hias uppercase">
            {dict.littleNote2}
          </p>
        </div>
      </>,
  }

  return (
    <>
      <DoubleFrame
        titles={[left_col.title,right_col.title]}
        subtitles={[left_col.subtitle,right_col.subtitle]}
        contents={[left_col.content,right_col.content]}
      />
      {dialog && (
        <ConfirmDialog
          title={dialog === "delete" ? dict.deleteaccount : dict.cleardata}
          description={dialog === "delete" ? dict.confirmDelete : dict.confirmClear}
          expected={dialog === "delete" ? dict.deleteValidation : dict.clearValidation}
          confirmLabel={dialog === "delete" ? dict.deleteaccount : dict.cleardata}
          cancelLabel={dict.cancel}
          mismatchMessage={dict.confirmMismatch}
          busy={dangerBusy}
          onConfirm={() => runDangerAction(dialog)}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
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