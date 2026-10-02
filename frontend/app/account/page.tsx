"use client";
import { INPUT_BASE, INPUT_LABEL_BASE, BTN_BASE, TOAST_SUCCESS_OPTIONS } from "@/app/constants/ui";
import { NAME_MIN, NAME_MAX, NAME_WARN, NAME_DANGER, PASSWORD_MIN, PASSWORD_MAX, PASSWORD_WARN, PASSWORD_DANGER } from "@/app/constants/validation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/authContext";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { CharCounter } from "../components/Atomic/CharCounter";
import { FormField } from "../components/Atomic/FormField";
import { PasswordInput } from "../components/Atomic/PasswordInput";
import { DoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";
import { ConfirmDialog } from "../components/Atomic/ConfirmDialog/ConfirmDialog";
import { Skeleton } from "./Skeleton";
import { SpotifyCard } from "./SpotifyCard";
import { DangerZone } from "./DangerZone";
import toast from "react-hot-toast";
import { useLanguage } from "../context/languageContext";

export default function AccountPage() {
  return (
    <ProtectedRoute skeleton={<Skeleton/>}>
      <AccountContent/>
    </ProtectedRoute>
  );
}

const PROFILE_STYLES = {
  INPUT_LABEL: `text2 ${INPUT_LABEL_BASE}`,
  INPUT_FIELD: INPUT_BASE,
  BTN_SAVE: BTN_BASE,
  ERROR_TEXT: `text2 ${INPUT_LABEL_BASE} block text-rouge text-[9px] pt-2`,
};

function AccountContent() {
  const { user, loading, updateUserProfile, deleteAccount, clearAccount, loginSpotify } = useAuth();
  const { t } = useLanguage();
  const dict = t.account;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      toast.success(dict.successToast, TOAST_SUCCESS_OPTIONS);
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : dict.errorDeleteMessage);
    } finally {setUpdating(false)}
  };

  // Exécute l'action irréversible une fois la saisie de confirmation validée par la fenêtre
  const runDangerAction = async (kind: "delete" | "clear") => {
    setDangerBusy(true);
    try {
      if (kind === "delete") await deleteAccount();
      else await clearAccount();
      toast.success(kind === "delete" ? dict.successDeleteToast : dict.successToastClear, TOAST_SUCCESS_OPTIONS);
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
          <FormField id="account-name" label={dict.titleDisplayname} labelClassName={PROFILE_STYLES.INPUT_LABEL}
            counter={<CharCounter value={username} max={NAME_MAX} min={NAME_MIN} warn={NAME_WARN} danger={NAME_DANGER} className={PROFILE_STYLES.INPUT_LABEL}/>}
            error={errors.errorName} errorClassName={PROFILE_STYLES.ERROR_TEXT}
          >
            {(field) => (
              <input {...field} className={PROFILE_STYLES.INPUT_FIELD} value={username ?? ""}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                placeholder={dict.placeholderName}
              />
            )}
          </FormField>

          {/* Champ Email */}
          <FormField id="account-email" label={dict.emailtitle} labelClassName={PROFILE_STYLES.INPUT_LABEL}>
            {(field) => <input {...field} value={email} className={PROFILE_STYLES.INPUT_FIELD} onChange={e => setEmail(e.target.value)}/>}
          </FormField>

          <hr className="border-white/5 my-4" />

          {/* Champ Mot de Passe */}
          <FormField id="account-pw" label={dict.passwordtitle} labelClassName={PROFILE_STYLES.INPUT_LABEL}
            counter={<CharCounter value={password} max={PASSWORD_MAX} min={PASSWORD_MIN} warn={PASSWORD_WARN} danger={PASSWORD_DANGER} className={PROFILE_STYLES.INPUT_LABEL}/>}
            error={errors.errorPw} errorClassName={PROFILE_STYLES.ERROR_TEXT}
          >
            {(field) => (
              <PasswordInput {...field} className={`${PROFILE_STYLES.INPUT_FIELD} pr-10`} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={dict.placeholderPw}
                showLabel={dict.showPassword} hideLabel={dict.hidePassword}
              />
            )}
          </FormField>

          {/* Champ Confirmation */}
          <FormField id="account-confirm" label={dict.confirmpwtitle} labelClassName={PROFILE_STYLES.INPUT_LABEL}
            error={errors.errorConfirmPw} errorClassName={`${PROFILE_STYLES.ERROR_TEXT} animate-pulse`}
          >
            {(field) => (
              <PasswordInput {...field} value={confirmPassword} placeholder={dict.placeholderpwc}
                className={`${PROFILE_STYLES.INPUT_FIELD} pr-10 ${password && confirmPassword && password !== confirmPassword ? 'border-red-500/50' : ''}`}
                onChange={(e) => setConfirmPassword(e.target.value)}
                showLabel={dict.showPassword} hideLabel={dict.hidePassword} buttonClassName="focus:outline-none"
              />
            )}
          </FormField>

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
        <SpotifyCard spotify={user.providers.SPOTIFY} synchronizedLabel={dict.synchronized}
          notSynchronizedLabel={dict.notsynchronized} linkLabel={dict.linkSpotify} onLink={loginSpotify}
        />
        {/* Note en bas */}
        <p className={`text3 text-[10px] text-center mt-8 leading-relaxed font-hias uppercase tracking-tighter`}>
          {dict.littleNote}
        </p>
        {/* Zone de danger : Suppression du compte */}
        <DangerZone clearLabel={dict.cleardata} deleteLabel={dict.deleteaccount} note={dict.littleNote2}
          onClear={() => setDialog("clear")} onDelete={() => setDialog("delete")}
        />
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
