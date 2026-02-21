"use client";
import { useState } from "react";
import { useApi } from "../hooks/useApi";

export default function SettingsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const { uploadJson, loading: uploading } = useApi();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setMessage("");
    }
  };

  const startImport = async () => {
    if (files.length === 0) return;
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    try {
      const data = await uploadJson(formData);
      setMessage(data.message || "Importation réussie !");
      setFiles([]);
    } catch (err: any) {setMessage(err.message || "Erreur lors de l'importation");}
  };

  return (
    <main className="min-h-screen py-12 px-6 max-w-4xl mx-auto text-white font-jost">
      <h1 className="text-4xl font-hias mb-4">Paramètres</h1>
      <p className="text-gray-500 mb-12">Gérez vos données et votre historique Spotify.</p>

      <div className="bg-bg2/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
        <h2 className="text-xl font-bold mb-2">Importer l'archive Spotify</h2>
        <p className="text-gray-400 text-sm">
          Rendez-vous sur la page de téléchargement de vos données sur Spotify, en cliquant sur le lien suivant :
          <code className="text-vert">
            <a href="https://www.spotify.com/fr/account/privacy/"> https://www.spotify.com/fr/account/privacy/</a>
          </code>
        </p>
        <p className="text-gray-400 text-sm mb-8">
          puis sélectionnez <code className="text-vert">historique de streaming étendu</code>, vous le recevrez très rapidement.
          Une fois reçu, importez tous les fichiers <code className="text-vert">Streaming_History_Audio_xxxx_y.json</code> ici.
        </p>

        <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-vert/50 transition-colors relative">
          <input 
            type="file" 
            multiple 
            accept=".json" 
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={uploading}
          />
          <div className="space-y-4">
            <div className="text-4xl">📁</div>
            <p className="text-sm text-gray-400">
              {files.length > 0 
                ? `${files.length} fichiers sélectionnés` 
                : "Glissez vos fichiers JSON ici ou cliquez pour parcourir"}
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <button 
            onClick={startImport}
            disabled={uploading}
            className="w-full mt-6 bg-vert text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:hover:scale-100"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Analyse des données en cours...
              </span>
            ) : (
              `Importer les ${files.length} fichiers`
            )}
          </button>
        )}

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-center text-sm font-bold ${
            message.includes("Erreur") ? "bg-red-500/10 text-red-400" : "bg-vert/10 text-vert"
          }`}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}