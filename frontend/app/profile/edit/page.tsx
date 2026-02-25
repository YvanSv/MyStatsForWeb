"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROFILE_EDIT_STYLES } from "../../styles/profile_edit";

export default function EditProfilePage() {
  const router = useRouter();

  // --- ÉTATS MOCKÉS ---
  const [formData, setFormData] = useState({
    display_name: "Alexandre",
    bio: "Fan de Daft Punk et de Synthwave 🚀",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    banner: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070",
  });

  const handleSave = () => {
    console.log("Saving data:", formData);
    router.back();
  };

  return (
    <main className={PROFILE_EDIT_STYLES.MAIN}>
      {/* --- ÉDITION BANNIÈRE --- */}
      <div className={PROFILE_EDIT_STYLES.BANNER_EDIT}>
        <img src={formData.banner} className={PROFILE_EDIT_STYLES.BANNER_IMG} alt="Banner Preview" />
        <div className="absolute inset-0 flex items-center justify-center text-white/50 font-medium">
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
            <CameraIcon size={18} /> Changer la bannière
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg1 to-transparent" />
      </div>

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- ÉDITION AVATAR --- */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className={PROFILE_EDIT_STYLES.AVATAR_WRAPPER}>
            <img src={formData.avatar} className={PROFILE_EDIT_STYLES.AVATAR_IMG} alt="Avatar Preview" />
            <div className={PROFILE_EDIT_STYLES.OVERLAY_ICON}>
              <CameraIcon size={32} />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left mb-4">
            <h1 className="text-3xl font-bold text-white mb-1">Modifier le profil</h1>
            <p className="text-gray-500 text-sm">Personnalisez votre apparence publique</p>
          </div>
        </div>

        {/* --- FORMULAIRE --- */}
        <div className={PROFILE_EDIT_STYLES.FORM_CARD}>
          <div>
            <label className={PROFILE_EDIT_STYLES.LABEL}>Nom d'affichage</label>
            <input 
              type="text" 
              className={PROFILE_EDIT_STYLES.INPUT}
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              placeholder="Votre nom..."
            />
          </div>

          <div>
            <label className={PROFILE_EDIT_STYLES.LABEL}>Bio / Description</label>
            <textarea 
              rows={4}
              className={`${PROFILE_EDIT_STYLES.INPUT} resize-none`}
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Dites-en un peu plus sur vos goûts musicaux..."
            />
          </div>

          {/* --- RÉGLAGES PRIVAUTÉ (Bonus Design) --- */}
          <div className="mt-4 p-4 border border-white/5 bg-white/5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Profil Public</p>
              <p className="text-gray-500 text-xs">Autoriser les autres à voir vos statistiques</p>
            </div>
            <div className="w-12 h-6 bg-vert rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>

          {/* --- ACTIONS --- */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <button 
              onClick={() => router.back()} 
              className={PROFILE_EDIT_STYLES.BTN_CANCEL}
            >
              Annuler
            </button>
            <button 
              onClick={handleSave}
              className={PROFILE_EDIT_STYLES.BTN_SAVE}
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// --- ICONES ---
const CameraIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);