"use client";
import { useState } from "react";
import { BASE_UI } from "../styles/general";
import { useApiUploadData } from "../hooks/useApiUploadData";
import { ApiError } from "../services/api";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { PrimaryButton } from "../components/Atomic/Buttons";
import { DoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";
import { SkeletonImport } from "./Skeleton";
import { useAuth } from "../context/authContext";
import { API_ENDPOINTS } from "../constants/routes";
import { useLanguage } from "../context/languageContext";
import Papa from 'papaparse';
import { AppleCSVRow, CleanAppleData } from "../data/DataInfos";
import { AppleRowError, appleRowToPlays, toBatches } from "./apple";

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
  ALERT_BASE: `border text-[10px] p-4 ${BASE_UI.rounded.input} font-bold uppercase tracking-widest`,
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
  
  // Note technique
  TECH_NOTE: `text3 mt-8 p-6 bg-white/[0.03] border border-white/5 ${BASE_UI.rounded.medium} italic text-[11px] space-y-3`,
  TECH_NOTE_TITLE: `text3 font-bold not-italic uppercase tracking-wider block mb-1`
};

export function ImportContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const dict = t.importData;
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState<string | null>("");
  const { uploadSpotifyJson, uploadAppleJson, loading } = useApiUploadData();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      // On vide le champ dans tous les cas (même après un refus) : sans cela, re-choisir le même fichier
      // ne déclencherait pas de nouvel événement change. Les File sont déjà copiés dans le tableau.
      e.target.value = "";

      // Tous les fichiers doivent avoir la même extension (.json Spotify ou .csv Apple)
      const extensions = new Set(selectedFiles.map(f => f.name.toLowerCase().split('.').pop()));
      const valid = extensions.size === 1 && (extensions.has('json') || extensions.has('csv'));
      if (!valid) return setError(dict.errorJsonOnly);

      setFiles(selectedFiles);
      setError("");
      setSuccess("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return setError(dict.errorNoFile);
    // Sans utilisateur connecté, pas de suivi de progression possible (le serveur refuserait la connexion)
    if (!user?.id) return setError(dict.errorSession);
    
    // Supposons qu'on détecte le type par l'extension du premier fichier
    const isApple = files[0].name.toLowerCase().endsWith('.csv');

    setError("");
    setSuccess("");
    setProgress(0);

    const ws = new WebSocket(`${API_ENDPOINTS.WEBSOCKET_PROGRESS}/${user.id}`);

    const startUpload = () => {
      return new Promise((resolve, reject) => {
        let opened = false;
        ws.onopen = async () => {
          opened = true;
          try {
            if (isApple) {
              setProcessing(true);
              let nb = 0;
              let totalAdded = 0;
              for (const file of files) {
                nb++;
                await parseAppleCSVInChunks(
                  file, 
                  async (chunk) => {
                    const response = await uploadAppleJson(chunk); 
        
                    // On incrémente le compteur avec la valeur retournée par le backend
                    if (response && typeof response.added === 'number') {
                      totalAdded += response.added;
                      // Optionnel : mettre à jour un message pour afficher le cumul
                      setProcessingMsg(dict.appleProgress(file.name, nb, files.length, totalAdded));
                    }
                  },
                  (processed, total) => {
                    const percent = Math.round((processed / total) * 100);
                    setProgress(percent);
                  }
                );
              }
              setProcessing(false);
              setProcessingMsg(null);
              // Le backend Apple ne pousse pas de progression : on ferme le WebSocket nous-mêmes
              ws.close();
              resolve({ message: dict.appleSent(totalAdded), added: totalAdded });
            } else resolve(await uploadSpotifyJson(files));
          } catch (err) {
            setProcessing(false);
            setProcessingMsg(null);
            reject(err);
          }
        };

        ws.onmessage = (event) => {
          let data;
          try { data = JSON.parse(event.data) } catch { return }
          if (typeof data?.percentage !== 'number') return;
          setProgress(data.percentage);
          if (data.percentage === 100) ws.close();
        };
        
        ws.onerror = () => reject(new Error(dict.errorWs));
        // Connexion refusée ou coupée avant l'ouverture : sans cela la promesse ne se terminerait jamais
        ws.onclose = () => { if (!opened) reject(new Error(dict.errorWs)) };
      });
    };

    try {
      const res = await startUpload() as { message?: string; added?: number; count?: number };
      setSuccess(res.message || dict.successImport(res.added ?? res.count ?? 0));
      setFiles([]);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof AppleRowError) setError(err.kind === "date" ? dict.errorAppleDate(err.value) : dict.errorAppleHour(err.value));
      else setError((err as Error)?.message === dict.errorWs ? dict.errorWs : dict.errorGeneric);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
  };

  const parseAppleCSVInChunks = (file: File, onChunk: (data: CleanAppleData[]) => Promise<void>,
    onProgress: (processed: number, total: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const totalSize = file.size; // On utilise la taille du fichier pour la progression globale

      Papa.parse<AppleCSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        transformHeader: (h) => h.trim(),
        
        chunk: async (results, parser) => {
          parser.pause();
          try {

          // 1. Filtrage et Mapping (une ligne = autant d'écoutes que de lectures, voir apple.ts)
          const cleanData = results.data.flatMap(appleRowToPlays);

          // 2. Envoi au backend, par lots pour borner la taille de chaque requête
          for (const batch of toBatches(cleanData)) await onChunk(batch);

          // 3. Notification de progression (basée sur la position du curseur dans le fichier)
          // meta.cursor donne l'index de l'octet actuel dans le fichier
          onProgress(results.meta.cursor, totalSize);

          parser.resume();
          } catch (err) {
            // Sans cela, l'erreur (ligne mal formée, échec d'un envoi) resterait une promesse rejetée non gérée et l'import ne se terminerait jamais
            reject(err);
            parser.abort(); // déclenche `complete`, sans effet : la promesse est déjà rejetée
          }
        },
        complete: () => {
          // On force à 100% à la fin pour être sûr
          onProgress(totalSize, totalSize);
          resolve();
        },
        error: (err) => reject(err)
      });
    });
  };

  const left_col = {
    icon: <div className={IMPORT_STYLES.ICON_BOX_VERT}><UploadIcon size={32}/></div>,
    title: dict.title,
    subtitle: dict.subtitle,
    content:
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="relative group">
        <input type="file" multiple accept=".json, .csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"/>
        <div className={`${IMPORT_STYLES.DROPZONE(files.length > 0)} text3`}>
          <FileIcon size={40}/>
          <p className={`text3 text-xs text-center`}>
            {files.length > 0 ? dict.dropzoneActive(files.length) : dict.dropzoneIdle}
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
      {processingMsg && <div className={IMPORT_STYLES.FOOTER_TEXT}>{processingMsg}</div>}
      {(processing || loading) && (
        <div className={IMPORT_STYLES.PROGRESS_CONTAINER}>
          {progress}%
          <div className={IMPORT_STYLES.PROGRESS_BAR}>
            <div className={IMPORT_STYLES.PROGRESS_FILL} style={{ width: `${progress}%`, transition: 'width 0.3s ease-out' }} />
          </div>
        </div>
      )}

      {(processing || loading || files.length === 0) ? (
        <button type="submit" disabled={true} className="text3 w-full py-4 rounded-full font-bold bg-white/5 border border-white/5 cursor-not-allowed">
          {loading ? dict.loadingBtn : dict.submitBtn}
        </button>
      ) : (
        <PrimaryButton type="submit" additional="w-full py-4">
          {dict.submitBtn}
        </PrimaryButton>
      )}
      <p className={IMPORT_STYLES.FOOTER_TEXT}>{dict.footerHint}</p>
    </form>
  }

  const right_col = {
    icon: <div className={IMPORT_STYLES.ICON_BOX_BLUE}><QuestionIcon size={32} /></div>,
    title: dict.helpTitle,
    subtitle: dict.helpSubtitle,
    content:
      <div className="space-y-6">
        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>1</span>
          <div className={IMPORT_STYLES.STEP_TEXT}>
            {dict.step1}
            <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noopener noreferrer" className={IMPORT_STYLES.EXTERNAL_LINK}>
              https://www.spotify.com/account/privacy/
            </a>
          </div>
        </div>

        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>2</span>
          <p className={IMPORT_STYLES.STEP_TEXT}>
            {dict.step2}
          </p>
        </div>

        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>3</span>
          <p className={IMPORT_STYLES.STEP_TEXT}>{dict.step3}</p>
        </div>

        <div className={IMPORT_STYLES.GUIDE_STEP_WRAPPER}>
          <span className={IMPORT_STYLES.STEP_NUMBER}>4</span>
          <p className={IMPORT_STYLES.STEP_TEXT}>
            {dict.step4}
          </p>
        </div>

        <div className={IMPORT_STYLES.TECH_NOTE}>
          <span className={IMPORT_STYLES.TECH_NOTE_TITLE}>{dict.noteTitle}</span>
          <p>{dict.note1}</p>
          <p>{dict.note2}</p>
          <p className={`pt-2 text2`}>{dict.note3}</p>
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