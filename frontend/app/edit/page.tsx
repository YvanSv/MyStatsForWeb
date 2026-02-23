"use client";

import { ENDPOINTS } from "../config";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import { PulseSpinner } from "../components/CustomSpinner";
import { useSearchParams } from "next/navigation";

export default function EditProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg1">
        <PulseSpinner/>
      </div>
    }>
      <EditProfileContent />
    </Suspense>
  );
}

function EditProfileContent() {
  const router = useRouter();
	const searchParams = useSearchParams();
  const { getMe, updateProfile, unlinkSpotify } = useApi();
  // États des données
  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    hasSpotify: false,
  });
  // États UI
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  // Charger les infos au montage
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getMe();
        if (!data.is_logged_in) router.push("/auth");
				else {
          setProfileData({
            username: data.user_name || "",
            email: data.email || "",
            hasSpotify: data.has_spotify || false,
          });
        }
      } catch (err: any) {
        setError("Impossible de charger votre profil.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [getMe, router]);

	useEffect(() => {
    const errorType = searchParams.get("error");
    const linked = searchParams.get("linked");

    if (errorType === "spotify_already_linked") {
      setError("Ce compte Spotify est déjà lié à un autre utilisateur MyStats.");
    }
    if (linked === "true") {
      setSuccess("Compte Spotify lié avec succès !");
    }
  }, [searchParams]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setSuccess("");
    setError("");

    try {
      await updateProfile({ username: profileData.username });
			setSuccess("Profil mis à jour avec succès !");
			router.refresh();
      setSuccess("Profil mis à jour avec succès !");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleConnectSpotify = () => {
    window.location.href = ENDPOINTS.SPOTIFY_LOGIN;
  };

	const handleUnlinkSpotify = async () => {
		if (!confirm("Voulez-vous vraiment délier votre compte Spotify ? Vos stats ne seront plus mises à jour.")) return;
		
		try {
			await unlinkSpotify(); 
			setProfileData({ ...profileData, hasSpotify: false });
			setSuccess("Compte Spotify délié avec succès.");
		} catch (err: any) {
			setError("Erreur lors de la déconnexion de Spotify.");
		}
	};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PulseSpinner/>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-20">
      {/* --- ANIMATION DE FOND (Identique à Auth) --- */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]" />
      </div>

      <div className="w-full max-w-5xl bg-bg2/40 backdrop-blur-2xl border border-white/5 rounded-[40px] shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          
          {/* COLONNE GAUCHE : INFOS PERSO */}
          <div className="flex-1 p-8 md:p-12 lg:p-16">
            <div className="mb-10">
              <h1 className="text-ss-titre md:text-s-titre font-jost text-white leading-none mb-3">Profil</h1>
              <p className="text-gray-500 text-md tracking-[0.2em] font-medium font-hias">Gérez vos informations.</p>
            </div>

            <form className="space-y-6" onSubmit={handleUpdateProfile}>
              {error && (
                <div className="bg-rouge/10 border border-rouge/20 text-rouge text-[10px] p-3 rounded-xl animate-shake">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-vert/10 border border-vert/20 text-vert text-[10px] p-3 rounded-xl">
                  {success}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold ml-2">Nom d'affichage</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-vert/50 outline-none transition-all focus:bg-white/10"
                  value={profileData.username} 
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  type="text" 
                />
              </div>

              <button disabled={updating} className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold border border-white/5 transition-all mt-4">
                {updating ? "Mise à jour..." : "Enregistrer les modifications"}
              </button>
            </form>
          </div>

          {/* SÉPARATEUR */}
          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="w-[1px] h-3/4 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
          </div>

          {/* COLONNE DROITE : CONNEXIONS */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 bg-white/[0.02] flex flex-col justify-center">
            <div className="mb-10">
              <h2 className="text-ss-titre md:text-s-titre font-jost text-white leading-none mb-3">Services</h2>
              <p className="text-gray-500 text-md tracking-[0.2em] font-medium font-hias">Liaison de comptes tiers.</p>
            </div>

            <div className={`p-6 rounded-[30px] border transition-all duration-500 ${profileData.hasSpotify ? 'bg-vert/5 border-vert/20' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-5 mb-6">
                <div className={`p-4 rounded-2xl ${profileData.hasSpotify ? 'bg-vert text-black' : 'bg-white/10 text-white'}`}>
                  <SpotifyIcon />
                </div>
                <div>
                  <h3 className="text-white font-bold font-jost text-lg">Spotify</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                    {profileData.hasSpotify ? "Connecté" : "Non lié"}
                  </p>
                </div>
              </div>

              {profileData.hasSpotify ? (
								<div className="space-y-4">
									{/* Message de succès */}
									<div className="flex items-center gap-2 text-vert text-[10px] font-bold uppercase tracking-widest bg-vert/10 p-3 rounded-xl justify-center">
										<CheckIcon /> Votre compte est synchronisé
									</div>
									
									{/* Bouton Délier */}
									<button 
										onClick={handleUnlinkSpotify}
										className="w-full bg-white/5 hover:bg-rouge/10 hover:text-rouge hover:border-rouge/20 text-gray-400 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all active:scale-95"
									>
										Délier mon compte Spotify
									</button>
								</div>
							) : (
								<button 
									onClick={handleConnectSpotify}
									className="w-full bg-vert text-black py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_20px_rgba(29,208,93,0.2)]"
								>
									Lier mon Spotify
								</button>
							)}
            </div>

            <p className="text-[10px] text-gray-600 text-center mt-8 leading-relaxed">
              La liaison Spotify permet à MyStats de récupérer vos écoutes en temps réel pour générer vos rapports personnalisés.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

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