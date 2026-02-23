"use client";

import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const { uploadJson } = useApi();

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return setError("Veuillez sélectionner au moins un fichier.");

    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await uploadJson(formData);
      setSuccess(`${res.added.toLocaleString('fr-FR')} écoutes ajoutées ! L'enrichissement est en cours.`);
      setFiles([]);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'importation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-20">
      {/* --- ANIMATION DE FOND --- */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl bg-bg2/40 backdrop-blur-2xl border border-white/5 rounded-[40px] shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          
          {/* COLONNE GAUCHE : FORMULAIRE D'IMPORT */}
          <div className="flex-1 p-8 md:p-12 lg:p-16">
            <div className="mb-10 text-center lg:text-left">
              <div className="inline-flex p-4 rounded-3xl bg-vert/10 text-vert mb-6">
                <UploadIcon size={32} />
              </div>
              <h1 className="text-ss-titre md:text-s-titre font-jost text-white leading-none mb-3">Importer vos données</h1>
              <p className="text-gray-500 text-md tracking-[0.1em] font-medium font-hias max-w-md">
                Glissez vos fichiers JSON Spotify pour synchroniser votre historique d'écoute.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <input
                  type="file"
                  multiple
                  accept=".json"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className={`border-2 border-dashed rounded-[30px] p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                  files.length > 0 ? "border-vert/50 bg-vert/5" : "border-white/10 bg-white/[0.02] group-hover:border-white/20"
                }`}>
                  <div className="text-gray-400 group-hover:scale-110 transition-transform duration-300">
                    <FileIcon size={40} />
                  </div>
                  <p className="text-xs font-jost text-gray-400 text-center">
                    {files.length > 0 
                      ? `${files.length} fichier(s) prêt(s)` 
                      : "Déposez vos fichiers .json ici"}
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2">
                  {files.map((f, i) => (
                    <span key={i} className="text-[9px] bg-white/5 px-3 py-1 rounded-full text-gray-400 border border-white/5 animate-in fade-in zoom-in-95">
                      {f.name}
                    </span>
                  ))}
                </div>
              )}

              {error && <div className="bg-rouge/10 border border-rouge/20 text-rouge text-[10px] p-4 rounded-2xl animate-shake font-bold uppercase tracking-widest">{error}</div>}
              {success && <div className="bg-vert/10 border border-vert/20 text-vert text-[10px] p-4 rounded-2xl font-bold uppercase tracking-widest">{success}</div>}

              <button
                disabled={loading || files.length === 0}
                className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${
                  loading || files.length === 0
                    ? "bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed"
                    : "bg-vert text-black shadow-[0_10px_30px_rgba(29,208,93,0.15)] hover:scale-[1.02]"
                }`}
              >
                {loading ? "Importation..." : "Lancer l'importation"}
              </button>
              <p className="text-[10px] text-gray-600 text-center leading-relaxed uppercase tracking-[0.12em] font-bold">
                Seuls les fichiers <span className="text-vert">Streaming_History_Audio_X.json</span> sont supportés
              </p>
            </form>
          </div>

          {/* SÉPARATEUR VISUEL (Desktop) */}
          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="w-[1px] h-3/4 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
          </div>

          {/* COLONNE DROITE : GUIDE */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 bg-white/[0.02]">
            <div className="mb-10 text-center lg:text-left">
              <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 text-blue-400 mb-6">
                <QuestionIcon size={32} />
              </div>
              <h1 className="text-ss-titre md:text-s-titre font-jost text-white leading-none mb-3">Aide</h1>
              <p className="text-gray-500 text-md tracking-[0.1em] font-medium font-hias max-w-md">
                Comment obtenir mes données ?
              </p>
            </div>

            <div className="space-y-6 text-gray-300 font-jost text-sm leading-relaxed">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">1</span>
                <p>
                  Rendez-vous sur la page de téléchargement de vos données sur Spotify, en cliquant sur le lien suivant : 
                  <br />
                  <a href="https://www.spotify.com/fr/account/privacy/" target="_blank" className="text-vert hover:underline break-all font-mono text-[12px] mt-2 block">
                    https://www.spotify.com/fr/account/privacy/
                  </a>
                </p>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">2</span>
                <p>
                  Sélectionnez <code className="text-vert bg-vert/5 px-1 rounded">historique de streaming étendu</code> en base de la page. Vous recevrez un email de Spotify pour confirmer la demande.
                </p>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">3</span>
                <p>Rendez-vous sur celui-ci pour valider.Vous recevrez un deuxième email une fois le lien de téléchargement prêt.</p>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">4</span>
                <p>
                  Une fois reçu, importez tous les fichiers <code className="text-vert bg-vert/5 px-1 rounded">Streaming_History_Audio_xxxx_y.json</code> ici.
                </p>
              </div>

              <div className="mt-8 p-4 bg-white/5 border border-white/5 rounded-2xl italic text-[12px] text-gray-500">
                <p>Note :</p>
                <p>L'importation s'effectue en deux étapes :</p>
                <ul>
                  <li className="flex items-start gap-1"><span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 inline-flex items-center justify-center text-[7px] font-bold">1</span>lecture de vos fichiers et insertion dans la base de données;</li>
                  <li className="flex items-start gap-1"><span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 inline-flex items-center justify-center text-[7px] font-bold">2</span>récupération des informations propres aux artistes et albums de vos écoutes.</li>
                </ul>
                <p className="pt-2">Après avoir cliqué sur le bouton <code className="text-vert bg-vert/5 px-1 rounded">Lancer l'importation</code>, vous pouvez quitter cette page. L'importation se fait en arrière-plan.</p>
                <p className="pt-2">Dans le cas de grands volumes de données, la première étape peut prendre jusqu'à <code className="text-jaune bg-jaune/5 px-1 rounded">quelques dizaines de secondes</code> pour traiter l'intégralité de vos statistiques, mais généralement vous avez le résultat instantanément.</p>
                <p className="pt-2">La deuxième étape, quant à elle, prend plus de temps. Comptez <code className="text-rouge bg-rouge/8 px-1 rounded">2 minutes</code> par fichier si aucun artiste et album n'existe déjà dans la base de données.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const UploadIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const FileIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/></svg>
const QuestionIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.1 7c0-3 2.4-5.4 6-5.4s6 2.4 6 5.4c0 3.6-3.6 6.12-6.12 7.8V18" /><line x1="12" y1="23" x2="12.01" y2="23" /></svg>