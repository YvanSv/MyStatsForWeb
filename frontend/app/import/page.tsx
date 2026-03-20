"use client";
import { useEffect, useState } from "react";
import { BASE_UI } from "../styles/general";
import { useApiSpotifyData } from "../hooks/useApiSpotifyData";
import { ApiError } from "../services/api";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { PrimaryButton } from "../components/Atomic/Buttons";
import { DoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";
import { SkeletonImport } from "./Skeleton";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { API_ENDPOINTS } from "../constants/routes";

export default function ImportPage() {
  return (
    <ProtectedRoute skeleton={<SkeletonImport/>}>
      <ImportContent/>
    </ProtectedRoute>
  );
}

const IMPORT_STYLES = {
  // En-têtes de colonnes
  ICON_BOX: "inline-flex p-4 rounded-3xl mb-6",
  get ICON_BOX_VERT() { return `${this.ICON_BOX} text2 bg-vert/10` },
  get ICON_BOX_BLUE() { return `${this.ICON_BOX} text-blue-400 bg-blue-500/10` },

  // Dropzone
  DROPZONE: (hasFiles: boolean) => `border-2 border-dashed ${BASE_UI.rounded.medium} p-8 ${BASE_UI.anim.base} flex flex-col items-center justify-center gap-4 ${
    hasFiles ? "border-vert/50 bg-vert/5" : "border-white/10 bg-white/[0.02] group-hover:border-white/20"
  }`,
  
  // Liste de fichiers
  FILE_LIST_WRAPPER: "flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2",
  FILE_BADGE: `text3 text-[9px] bg-white/5 px-3 py-1 ${BASE_UI.rounded.badge} border border-white/5 animate-in fade-in zoom-in-95`,
  
  // Alertes & Progress
  ALERT_BASE: "border text-[10px] p-4 ${BASE_UI.rounded.input} font-bold uppercase tracking-widest",
  get ALERT_ERROR() { return `${this.ALERT_BASE} bg-rouge/10 border-rouge/20 text-rouge animate-shake` },
  get ALERT_SUCCESS() { return `${this.ALERT_BASE} bg-vert/10 border-vert/20 text2` },
  PROGRESS_CONTAINER: "flex items-center text-[10px] text-white mb-4 gap-2",
  PROGRESS_BAR: "w-full bg-white/5 h-1 rounded-full overflow-hidden",
  PROGRESS_FILL: "bg-vert h-full animate-progress-fast",

  // Bouton
  FOOTER_TEXT: `text3 text-[10px] text-center leading-relaxed uppercase tracking-[0.12em] font-bold`,

  // Guide (Droite)
  GUIDE_STEP_WRAPPER: "flex gap-4",
  STEP_NUMBER: `text1 flex-shrink-0 w-6 h-6 ${BASE_UI.rounded.badge} bg-white/5 border border-white/10 ${BASE_UI.common.flexCenter} text-[10px] font-bold`,
  STEP_TEXT: `text1 text-sm leading-relaxed`,
  EXTERNAL_LINK: `text2 hover:underline break-all font-mono text-[12px] mt-2 block`,
  CODE_TAG: `text2 bg-vert/5 px-1 rounded mx-1`,
  
  // Note technique
  TECH_NOTE: `text3 mt-8 p-6 bg-white/[0.03] border border-white/5 ${BASE_UI.rounded.medium} italic text-[11px] space-y-3`,
  TECH_NOTE_TITLE: `text3 font-bold not-italic uppercase tracking-wider block mb-1`
};

export function ImportContent() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(0);
  const { uploadSpotifyJson, loading } = useApiSpotifyData();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // OPTIONNEL : Validation locale du type de fichier
      const invalidFiles = selectedFiles.filter(f => !f.name.endsWith('.json'));
      if (invalidFiles.length > 0) return setError("Seuls les fichiers .json sont acceptés.");

      setFiles(selectedFiles);
      setError("");
      setSuccess("");
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return setError("Veuillez sélectionner au moins un fichier.");
    setError("");
    setSuccess("");
    setProgress(0);

    const ws = new WebSocket(`${API_ENDPOINTS.WEBSOCKET_PROGRESS}/${user?.id}`);
    const startUpload = () => {
      return new Promise((resolve, reject) => {
        ws.onopen = async () => {
          try {resolve(await uploadSpotifyJson(files))}
          catch (err) {reject(err)}
        };

        ws.onmessage = (event) => {
          setProgress(JSON.parse(event.data).percentage);
          if (progress === 100) ws.close();
        };
        ws.onerror = () => reject(new Error("Erreur de connexion au suivi de progression."));
      });
    };

    try {
      const res: any = await startUpload();
      setSuccess(res.message || `${res.added ?? res.count ?? 0} écoutes importées !`);
      setFiles([]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'importation.");
      ws.close();
    }
  };

  const left_col = {
    icon: <div className={IMPORT_STYLES.ICON_BOX_VERT}><UploadIcon size={32}/></div>,
    title: 'Importer vos données',
    subtitle: 'Glissez vos fichiers JSON Spotify pour synchroniser votre historique d\'écoute.',
    content:
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="relative group">
        <input type="file" multiple accept=".json" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"/>
        <div className={`${IMPORT_STYLES.DROPZONE(files.length > 0)} text3`}>
          <FileIcon size={40}/>
          <p className={`text3 text-xs text-center`}>
            {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : "Déposez vos fichiers .json ici"}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className={IMPORT_STYLES.FILE_LIST_WRAPPER}>
          {files.map((f, i) => (
            <span key={i} className={IMPORT_STYLES.FILE_BADGE}>{f.name}</span>
          ))}
        </div>
      )}

      {error && <div className={IMPORT_STYLES.ALERT_ERROR}>{error}</div>}
      {success && <div className={IMPORT_STYLES.ALERT_SUCCESS}>{success}</div>}
      
      {loading && (
        <div className={IMPORT_STYLES.PROGRESS_CONTAINER}>
          {progress}%
          <div className={IMPORT_STYLES.PROGRESS_BAR}>
            <div className={IMPORT_STYLES.PROGRESS_FILL} style={{ width: `${progress}%`, transition: 'width 0.3s ease-out' }} />
          </div>
        </div>
      )}

      {(loading || files.length === 0) ? (
        <button type="submit" disabled={true} className="text3 w-full py-4 rounded-full font-bold bg-white/5 border border-white/5 cursor-not-allowed">
          {loading ? "Importation en cours..." : "Lancer l'importation"}
        </button>
      ) : (
        <PrimaryButton type="submit" additional="w-full py-4">
          Lancer l'importation
        </PrimaryButton>
      )}

      <p className={IMPORT_STYLES.FOOTER_TEXT}>
        Seuls les fichiers <span className="text2">Streaming_History_Audio_X.json</span> sont supportés
      </p>
    </form>
  }

  const right_col = {
    icon: <div className={IMPORT_STYLES.ICON_BOX_BLUE}><QuestionIcon size={32} /></div>,
    title: 'Aide',
    subtitle: 'Comment obtenir mes données ?',
    content:
      <div className="space-y-6">
        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>1</span>
          <div className={IMPORT_STYLES.STEP_TEXT}>
            Accédez à votre compte Spotify sur le web pour demander vos données personnelles.
            <a href="https://www.spotify.com/account/privacy/" target="_blank" className={IMPORT_STYLES.EXTERNAL_LINK}>
              https://www.spotify.com/account/privacy/
            </a>
          </div>
        </div>

        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>2</span>
          <p className={IMPORT_STYLES.STEP_TEXT}>
            Sélectionnez <code className={IMPORT_STYLES.CODE_TAG}>Historique de streaming étendu</code> en bas de la page.
          </p>
        </div>

        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>3</span>
          <p className={IMPORT_STYLES.STEP_TEXT}>Une fois l'archive reçue (sous quelques jours), extrayez le dossier ZIP.</p>
        </div>

        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>4</span>
          <p className={IMPORT_STYLES.STEP_TEXT}>
            Importez ici tous les fichiers commençant par <code className={IMPORT_STYLES.CODE_TAG}>Streaming_History_Audio</code>.
          </p>
        </div>

        <div className={IMPORT_STYLES.TECH_NOTE}>
          <span className={IMPORT_STYLES.TECH_NOTE_TITLE}>Processus d'import :</span>
          <p>1. Les écoutes sont injectées presque instantanément dans la base de données de MyStats.</p>
          <p>2. Un enrichissement automatique récupère les images et durées (env. 2 min / fichier).</p>
          <p className={`pt-2 text2`}>Vous pouvez quitter cette page une fois l'import lancé.</p>
        </div>
      </div>
  }

  return (
    <DoubleFrame
      icons={[left_col.icon,right_col.icon]}
      titles={[left_col.title,right_col.title]}
      subtitles={[left_col.subtitle,right_col.subtitle]}
      contents={[left_col.content,right_col.content]}
    />
  );
}

// --- ICONS ---
const UploadIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const FileIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/></svg>
const QuestionIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.1 7c0-3 2.4-5.4 6-5.4s6 2.4 6 5.4c0 3.6-3.6 6.12-6.12 7.8V18" /><line x1="12" y1="23" x2="12.01" y2="23" /></svg>