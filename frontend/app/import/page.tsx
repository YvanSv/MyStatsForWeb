"use client";

import { useState } from "react";
import { BASE_UI, GENERAL_STYLES } from "../styles/general";
import { useApiSpotifyData } from "../hooks/useApiSpotifyData";
import ProtectedRoute from "../components/auth/ProtectedRoute";

export default function ImportPage() {
  return (
    <ProtectedRoute skeleton={<SkeletonImport/>}>
      <ImportContent/>
    </ProtectedRoute>
  );
}

const IMPORT_STYLES = {
  // Wrappers principaux
  CONTAINER_WRAPPER: `min-h-[85vh] ${BASE_UI.common.flexCenter} px-4 py-12 md:py-20`,
  CARD: `w-full max-w-6xl ${BASE_UI.common.glass} ${BASE_UI.rounded.large} shadow-2xl overflow-hidden bg-bg2/40`,
  CONTENT_FLEX: "flex flex-col lg:flex-row",
  
  // Colonnes
  COLUMN: "flex-1 p-8 md:p-12 lg:p-16",
  get LEFT_COL() { return this.COLUMN },
  get RIGHT_COL() { return `${this.COLUMN} bg-white/[0.02]` },
  SEPARATOR: "hidden lg:flex flex-col items-center justify-center",
  SEPARATOR_LINE: "w-[1px] h-3/4 bg-gradient-to-b from-transparent via-white/10 to-transparent",

  // En-têtes de colonnes
  HEADER_WRAPPER: "mb-10 text-center lg:text-left",
  ICON_BOX: "inline-flex p-4 rounded-3xl mb-6",
  get ICON_BOX_VERT() { return `${this.ICON_BOX} ${GENERAL_STYLES.TEXT2} bg-vert/10` },
  get ICON_BOX_BLUE() { return `${this.ICON_BOX} text-blue-400 bg-blue-500/10` },
  TITLE: GENERAL_STYLES.TITRE_DOUBLE_FRAME,
  SUBTITLE: `${GENERAL_STYLES.TEXT3} text-md tracking-[0.08em] font-medium max-w-md`,

  // Dropzone
  DROPZONE: (hasFiles: boolean) => `border-2 border-dashed ${BASE_UI.rounded.medium} p-8 ${BASE_UI.anim.base} flex flex-col items-center justify-center gap-4 ${
    hasFiles ? "border-vert/50 bg-vert/5" : "border-white/10 bg-white/[0.02] group-hover:border-white/20"
  }`,
  
  // Liste de fichiers
  FILE_LIST_WRAPPER: "flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2",
  FILE_BADGE: `${GENERAL_STYLES.TEXT3} text-[9px] bg-white/5 px-3 py-1 ${BASE_UI.rounded.badge} border border-white/5 animate-in fade-in zoom-in-95`,
  
  // Alertes & Progress
  ALERT_BASE: "border text-[10px] p-4 ${BASE_UI.rounded.input} font-bold uppercase tracking-widest",
  get ALERT_ERROR() { return `${this.ALERT_BASE} bg-rouge/10 border-rouge/20 text-rouge animate-shake` },
  get ALERT_SUCCESS() { return `${this.ALERT_BASE} bg-vert/10 border-vert/20 ${GENERAL_STYLES.TEXT2}` },
  PROGRESS_CONTAINER: "w-full bg-white/5 h-1 rounded-full overflow-hidden mb-4",
  PROGRESS_BAR: "w-full bg-white/5 h-1 rounded-full overflow-hidden mb-4",
  PROGRESS_FILL: "bg-vert h-full animate-progress-fast",

  // Bouton
  BTN_SUBMIT: (isDisabled: boolean) => isDisabled 
    ? `${GENERAL_STYLES.TEXT3} w-full py-4 ${BASE_UI.rounded.badge} font-bold bg-white/5 border border-white/5 cursor-not-allowed`
    : `${GENERAL_STYLES.GREENBUTTON} w-full py-4`,
  FOOTER_TEXT: `${GENERAL_STYLES.TEXT3} text-[10px] text-center leading-relaxed uppercase tracking-[0.12em] font-bold`,

  // Guide (Droite)
  GUIDE_STEP_WRAPPER: "flex gap-4",
  STEP_NUMBER: `${GENERAL_STYLES.TEXT1} flex-shrink-0 w-6 h-6 ${BASE_UI.rounded.badge} bg-white/5 border border-white/10 ${BASE_UI.common.flexCenter} text-[10px] font-bold`,
  STEP_TEXT: `${GENERAL_STYLES.TEXT1} text-sm leading-relaxed`,
  EXTERNAL_LINK: `${GENERAL_STYLES.TEXT2} hover:underline break-all font-mono text-[12px] mt-2 block`,
  CODE_TAG: `${GENERAL_STYLES.TEXT2} bg-vert/5 px-1 rounded mx-1`,
  
  // Note technique
  TECH_NOTE: `${GENERAL_STYLES.TEXT3} mt-8 p-6 bg-white/[0.03] border border-white/5 ${BASE_UI.rounded.medium} italic text-[11px] space-y-3`,
  TECH_NOTE_TITLE: `${GENERAL_STYLES.TEXT3} font-bold not-italic uppercase tracking-wider block mb-1`
};

export function ImportContent() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { uploadSpotifyJson, loading } = useApiSpotifyData();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return setError("Veuillez sélectionner au moins un fichier.");
    setError("");
    setSuccess("");
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    try {
      const res = await uploadSpotifyJson(files);
      res.added && setSuccess(`${res.added} écoutes importées !`);
      res.message && setSuccess(`${res.message} écoutes importées !`);
      setFiles([]);
    }
    catch (err: any) {setError(err.message || "Erreur lors de l'importation.")}
  };

  return (
    <div className={IMPORT_STYLES.CONTAINER_WRAPPER}>
      <div className={IMPORT_STYLES.CARD}>
        <div className={IMPORT_STYLES.CONTENT_FLEX}>
          
          {/* COLONNE GAUCHE : FORMULAIRE */}
          <div className={IMPORT_STYLES.LEFT_COL}>
            <div className={IMPORT_STYLES.HEADER_WRAPPER}>
              <div className={IMPORT_STYLES.ICON_BOX_VERT}><UploadIcon size={32}/></div>
              <h1 className={IMPORT_STYLES.TITLE}>Importer vos données</h1>
              <p className={IMPORT_STYLES.SUBTITLE}>Glissez vos fichiers JSON Spotify pour synchroniser votre historique d'écoute.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="relative group">
                <input type="file" multiple accept=".json" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <div className={IMPORT_STYLES.DROPZONE(files.length > 0)}>
                  <FileIcon size={40}/>
                  <p className={`${GENERAL_STYLES.TEXT3} text-xs text-center`}>
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
                  <div className={IMPORT_STYLES.PROGRESS_BAR} style={{ width: '60%' }} />
                </div>
              )}

              <button type="submit" disabled={loading || files.length === 0} className={IMPORT_STYLES.BTN_SUBMIT(loading || files.length === 0)}>
                {loading ? "Importation en cours..." : "Lancer l'importation"}
              </button>

              <p className={IMPORT_STYLES.FOOTER_TEXT}>
                Seuls les fichiers <span className={GENERAL_STYLES.TEXT2}>Streaming_History_Audio_X.json</span> sont supportés
              </p>
            </form>
          </div>

          <div className={IMPORT_STYLES.SEPARATOR}><div className={IMPORT_STYLES.SEPARATOR_LINE} /></div>

          {/* COLONNE DROITE : GUIDE */}
          <div className={IMPORT_STYLES.RIGHT_COL}>
            <div className={IMPORT_STYLES.HEADER_WRAPPER}>
              <div className={IMPORT_STYLES.ICON_BOX_BLUE}><QuestionIcon size={32} /></div>
              <h1 className={IMPORT_STYLES.TITLE}>Aide</h1>
              <p className={IMPORT_STYLES.SUBTITLE}>Comment obtenir mes données ?</p>
            </div>

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
                <p className={`pt-2 ${GENERAL_STYLES.TEXT2}`}>Vous pouvez quitter cette page une fois l'import lancé.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SKELETON_STYLES = {
  PULSE: `${BASE_UI.anim.base} animate-pulse bg-white/5 ${BASE_UI.rounded.input}`,
  TEXT_LG: `h-10 bg-white/10 ${BASE_UI.rounded.item} animate-pulse`,
  TEXT_MD: `h-4 bg-white/5 rounded-lg animate-pulse`,
  TEXT_SM: `h-3 bg-white/5 rounded animate-pulse`,
};

function SkeletonImport() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-6xl bg-bg2/20 backdrop-blur-2xl border border-white/5 rounded-[40px] overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          
          {/* COLONNE GAUCHE : SIMULATION FORMULAIRE */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 space-y-10">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl animate-pulse" />
              <div className={`w-64 ${SKELETON_STYLES.TEXT_LG}`} />
              <div className={`w-full max-w-sm ${SKELETON_STYLES.TEXT_MD}`} />
            </div>

            <div className="space-y-6">
              {/* Zone Dropzone simulée */}
              <div className="h-40 w-full border-2 border-dashed border-white/5 rounded-[30px] flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse" />
                <div className={`w-40 ${SKELETON_STYLES.TEXT_SM}`} />
              </div>

              {/* Bouton simulé */}
              <div className="h-14 w-full bg-white/10 rounded-2xl animate-pulse" />
              
              <div className={`w-48 mx-auto ${SKELETON_STYLES.TEXT_SM}`} />
            </div>
          </div>

          {/* SÉPARATEUR */}
          <div className="hidden lg:flex items-center">
            <div className="w-[1px] h-3/4 bg-white/5" />
          </div>

          {/* COLONNE DROITE : SIMULATION GUIDE */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 bg-white/[0.01] space-y-10">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl animate-pulse" />
              <div className={`w-32 ${SKELETON_STYLES.TEXT_LG}`} />
              <div className={`w-48 ${SKELETON_STYLES.TEXT_MD}`} />
            </div>

            <div className="space-y-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex gap-4 items-start">
                  <div className="w-8 h-8 shrink-0 bg-white/5 rounded-full animate-pulse" />
                  <div className="space-y-2 w-full">
                    <div className={`w-full ${SKELETON_STYLES.TEXT_MD}`} />
                    <div className={`w-2/3 ${SKELETON_STYLES.TEXT_MD}`} />
                  </div>
                </div>
              ))}

              {/* Note technique simulée */}
              <div className="mt-8 p-6 bg-white/5 rounded-[30px] space-y-3">
                <div className={`w-32 bg-white/10 ${SKELETON_STYLES.TEXT_SM}`} />
                <div className={`w-full ${SKELETON_STYLES.TEXT_SM}`} />
                <div className={`w-full ${SKELETON_STYLES.TEXT_SM}`} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- ICONS ---
const UploadIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const FileIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/></svg>
const QuestionIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.1 7c0-3 2.4-5.4 6-5.4s6 2.4 6 5.4c0 3.6-3.6 6.12-6.12 7.8V18" /><line x1="12" y1="23" x2="12.01" y2="23" /></svg>