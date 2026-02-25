"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROFILE_EDIT_STYLES = {
  MAIN: "min-h-screen pb-20 bg-bg1",
  
  // Banner Section
  BANNER_WRAPPER: "relative h-[250px] w-full group cursor-pointer overflow-hidden bg-bg2",
  BANNER_IMG: "w-full h-full object-cover opacity-40 transition-opacity group-hover:opacity-30",
  BANNER_OVERLAY: "absolute inset-0 flex items-center justify-center text-white/50 font-medium",
  BANNER_BADGE: "flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md",
  BANNER_GRADIENT: "absolute inset-0 bg-gradient-to-t from-bg1 to-transparent",

  // Profile Header
  CONTAINER: "max-w-4xl mx-auto px-6 -mt-20 relative z-10",
  HEADER_FLEX: "flex flex-col md:flex-row items-center md:items-end gap-6",
  TEXT_GROUP: "flex-1 text-center md:text-left mb-4",
  TITLE: "text-3xl font-bold text-white mb-1",
  SUBTITLE: "text-gray-500 text-sm",

  // Avatar Edit
  AVATAR_WRAPPER: "relative w-40 h-40 group cursor-pointer mx-auto md:mx-0",
  AVATAR_IMG: "w-full h-full rounded-[35px] border-4 border-bg1 bg-bg2 object-cover shadow-2xl transition-all group-hover:brightness-50",
  OVERLAY_ICON: "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white",

  // Form
  FORM_CARD: "bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 mt-12",
  FIELD_GROUP: "mb-6",
  LABEL: "block text-gray-400 text-xs font-hias uppercase tracking-widest mb-2 ml-1",
  INPUT: "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-vert/50 transition-all",
  TEXTAREA: "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-vert/50 transition-all resize-none",
  
  // Privacy Toggle
  TOGGLE_CARD: "mt-4 p-4 border border-white/5 bg-white/5 rounded-2xl flex items-center justify-between",
  TOGGLE_LABEL: "text-white text-sm font-medium",
  TOGGLE_DESC: "text-gray-500 text-xs",
  TOGGLE_SWITCH: "w-12 h-6 bg-vert rounded-full relative cursor-pointer",
  TOGGLE_KNOB: "absolute right-1 top-1 w-4 h-4 bg-white rounded-full",

  // Footer Actions
  FOOTER: "flex items-center justify-end gap-4 mt-10",
  BTN_SAVE: "px-10 py-3 bg-vert hover:bg-vert/90 text-bg1 font-bold rounded-2xl transition-all active:scale-95",
  BTN_CANCEL: "px-6 py-3 text-gray-400 hover:text-white transition-colors"
};

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
      <div className={PROFILE_EDIT_STYLES.BANNER_WRAPPER}>
        <img src={formData.banner} className={PROFILE_EDIT_STYLES.BANNER_IMG} alt="Banner Preview" />
        <div className={PROFILE_EDIT_STYLES.BANNER_OVERLAY}>
          <div className={PROFILE_EDIT_STYLES.BANNER_BADGE}>
            <CameraIcon size={18} /> Changer la bannière
          </div>
        </div>
        <div className={PROFILE_EDIT_STYLES.BANNER_GRADIENT} />
      </div>

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- ÉDITION AVATAR --- */}
        <div className={PROFILE_EDIT_STYLES.HEADER_FLEX}>
          <div className={PROFILE_EDIT_STYLES.AVATAR_WRAPPER}>
            <img src={formData.avatar} className={PROFILE_EDIT_STYLES.AVATAR_IMG} alt="Avatar Preview" />
            <div className={PROFILE_EDIT_STYLES.OVERLAY_ICON}>
              <CameraIcon size={32} />
            </div>
          </div>
          
          <div className={PROFILE_EDIT_STYLES.TEXT_GROUP}>
            <h1 className={PROFILE_EDIT_STYLES.TITLE}>Modifier le profil</h1>
            <p className={PROFILE_EDIT_STYLES.SUBTITLE}>Personnalisez votre apparence publique</p>
          </div>
        </div>

        {/* --- FORMULAIRE --- */}
        <div className={PROFILE_EDIT_STYLES.FORM_CARD}>
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <label className={PROFILE_EDIT_STYLES.LABEL}>Nom d'affichage</label>
            <input 
              type="text" 
              className={PROFILE_EDIT_STYLES.INPUT}
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              placeholder="Votre nom..."
            />
          </div>

          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <label className={PROFILE_EDIT_STYLES.LABEL}>Bio / Description</label>
            <textarea 
              rows={4}
              className={PROFILE_EDIT_STYLES.TEXTAREA}
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Dites-en un peu plus sur vos goûts musicaux..."
            />
          </div>

          {/* --- RÉGLAGES PRIVAUTÉ --- */}
          <div className={PROFILE_EDIT_STYLES.TOGGLE_CARD}>
            <div>
              <p className={PROFILE_EDIT_STYLES.TOGGLE_LABEL}>Profil Public</p>
              <p className={PROFILE_EDIT_STYLES.TOGGLE_DESC}>Autoriser les autres à voir vos statistiques</p>
            </div>
            <div className={PROFILE_EDIT_STYLES.TOGGLE_SWITCH}>
              <div className={PROFILE_EDIT_STYLES.TOGGLE_KNOB} />
            </div>
          </div>

          {/* --- ACTIONS --- */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <button onClick={() => router.back()} className={PROFILE_EDIT_STYLES.BTN_CANCEL}>
              Annuler
            </button>
            <button onClick={handleSave} className={PROFILE_EDIT_STYLES.BTN_SAVE}>
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