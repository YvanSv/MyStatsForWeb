"use client";
import { useState } from "react";
import { ENDPOINTS } from "../config";

export default function SettingsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const startImport = async () => {
    if (files.length === 0) return;
    setUploading(true);
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    try {
      const response = await fetch(ENDPOINTS.UPLOAD_JSON, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      setMessage(data.message);
      setFiles([]);
    } catch (err) {
      setMessage("Erreur lors de l'importation");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-6 max-w-4xl mx-auto text-white font-jost">
      <h1 className="text-4xl font-hias mb-4">Paramètres</h1>
      <p className="text-gray-500 mb-12">Gérez vos données et votre historique Spotify.</p>

      <div className="bg-bg2/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
        <h2 className="text-xl font-bold mb-2">Importer l'archive Spotify</h2>
        <p className="text-gray-400 text-sm mb-8">
          Allez dans vos paramètres Spotify {">"} Confidentialité et téléchargez vos "Données d'utilisation étendue". 
          Une fois reçues, importez tous les fichiers <code className="text-vert">endsong.json</code> ici.
        </p>

        <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-vert/50 transition-colors relative">
          <input 
            type="file" 
            multiple 
            accept=".json" 
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
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
            className="w-full mt-6 bg-vert text-black py-4 rounded-2xl font-bold hover:scale-[1.02] transition disabled:opacity-50"
          >
            {uploading ? "Analyse des données..." : `Importer les ${files.length} fichiers`}
          </button>
        )}

        {message && <p className="mt-4 text-center text-vert text-sm font-bold">{message}</p>}
      </div>
    </main>
  );
}