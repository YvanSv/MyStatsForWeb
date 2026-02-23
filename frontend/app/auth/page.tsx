"use client";

import { ENDPOINTS } from "../config";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi"; 

export default function AuthPage() {
	const router = useRouter();
	// États pour le Login
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  // États pour le Register
  const [regData, setRegData] = useState({ 
    username: "", 
    email: "", 
    password: "", 
    confirmPassword: "" 
  });
  const [regError, setRegError] = useState("");
	// État de chargement global
  const [loading, setLoading] = useState(false);
	// Message de confirmation
	const searchParams = useSearchParams();
  const [successMessage, setSuccessMessage] = useState("");
  const { register, login } = useApi();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
			setSuccessMessage("Compte créé avec succès ! Connectez-vous maintenant.");
			if (searchParams.get("connected") === "true")
      	setSuccessMessage("Compte créé avec succès ! Vous êtes déjà connecté.");
		}
  }, [searchParams]);

  // --- HANDLERS ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!loginData.email || !loginData.password) {
      return setLoginError("Veuillez remplir tous les champs.");
    }

    setLoading(true);
    try {
      await login(JSON.stringify(loginData));
      router.push("/");
      router.refresh();
    } catch (err: any) {setLoginError(err.message);}
    finally {setLoading(false);}
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    // Vérifications de base
    if (!regData.username || !regData.email || !regData.password) {
      return setRegError("Tous les champs sont obligatoires.");
    }
    if (regData.password.length < 6) {
      return setRegError("Le mot de passe doit faire au moins 6 caractères.");
    }
    if (regData.password !== regData.confirmPassword) {
      return setRegError("Les mots de passe ne correspondent pas.");
    }

    setLoading(true);
    try {
      const res = await register(JSON.stringify({
        username: regData.username,
        email: regData.email,
        password: regData.password
      }));

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur lors de l'inscription");
      }

			// AUTO-LOGIN
      const loginRes = await login(JSON.stringify({
        email: regData.email,
        password: regData.password
      }));

      if (loginRes.ok) {
        router.push("/auth?registered=true&connected=true"); 
        router.refresh();
      } else {
        // Si l'auto-login foire, on renvoie quand même au login manuel
        router.push("/auth?registered=true");
      }
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotifyLogin = () => {
    window.location.href = ENDPOINTS.SPOTIFY_LOGIN;
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
          
          {/* COLONNE GAUCHE : LOGIN */}
          <div className="flex-1 p-8 md:p-12 lg:p-16">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="text-ss-titre md:text-s-titre font-jost text-white leading-none mb-3">Connexion</h1>
              <p className="text-gray-500 text-md tracking-[0.2em] font-medium font-hias">Bon retour sur MyStats.</p>
            </div>

            <button 
              onClick={handleSpotifyLogin}
              className="w-full flex items-center justify-center gap-3 bg-vert text-black py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all active:scale-95 mb-8 shadow-[0_0_20px_rgba(29,208,93,0.2)]"
            >
              <SpotifyIcon />
              Continuer avec Spotify
            </button>

            <div className="relative mb-8 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <span className="relative px-4 bg-[#2a2a2a] text-[9px] text-gray-500 uppercase tracking-widest">Ou</span>
            </div>

            <form className="space-y-4" onSubmit={handleLoginSubmit}>
							{loginError && (
								<div className="bg-rouge/10 border border-rouge/20 text-rouge text-[10px] p-3 rounded-xl animate-shake">
									{loginError}
								</div>
							)}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold ml-2">Email</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-vert/50 outline-none transition-all focus:bg-white/10"
      						required value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} placeholder="votre@email.com" type="email"
								/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold ml-2">Mot de passe</label>
                <input type="password" required value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})}
									className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-vert/50 outline-none transition-all focus:bg-white/10" placeholder="••••••••"
								/>
              </div>
              <button disabled={loading} className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold border border-white/5 transition-all mt-4">
                {loading ? "Chargement..." : "Se connecter"}
              </button>
            </form>
          </div>

          {/* SÉPARATEUR VISUEL (Desktop) */}
          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="w-[1px] h-3/4 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
          </div>

          {/* COLONNE DROITE : REGISTER */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 bg-white/[0.02]">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-ss-titre md:text-s-titre font-jost text-white leading-none mb-3">S'inscrire</h2>
              <p className="text-gray-500 text-md tracking-[0.2em] font-medium font-hias">Nouveau ici ? Bienvenue.</p>
            </div>

            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
							{regError && (
								<div className="bg-rouge/10 border border-rouge/20 text-rouge text-[10px] p-3 rounded-xl">
									{regError}
								</div>
							)}
							{/* MESSAGE DE SUCCÈS */}
							{successMessage && (
								<div className="bg-vert/10 border border-vert/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
									<div className="bg-vert rounded-full p-1 shrink-0">
										<CheckIcon />
									</div>
									<p className="text-vert text-[11px] font-bold uppercase tracking-tight leading-tight">
										{successMessage}
									</p>
								</div>
							)}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold ml-2">Nom d'utilisateur</label>
                <input type="text" required value={regData.username} onChange={(e) => setRegData({...regData, username: e.target.value})}
									className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-vert/50 outline-none transition-all" placeholder="MusicFan_01"
								/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold ml-2">Email</label>
                <input type="email" required value={regData.email} onChange={(e) => setRegData({...regData, email: e.target.value})}
									className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-vert/50 outline-none transition-all" placeholder="votre@email.com"
								/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold ml-2">Mot de passe</label>
                  <input type="password" required value={regData.password} onChange={(e) => setRegData({...regData, password: e.target.value})}
										password-input="true" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-vert/50 outline-none transition-all" placeholder="••••"
									/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold ml-2">Confirmation</label>
                  <input type="password" required value={regData.confirmPassword} onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
										className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-vert/50 outline-none transition-all" placeholder="••••"
									/>
                </div>
              </div>

              <div className="pt-4">
                <button disabled={loading} className="w-full bg-vert text-black py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all active:scale-95 shadow-[0_10px_30px_rgba(29,208,93,0.15)]">
                  Créer mon compte
                </button>
              </div>
              
              <p className="text-[10px] text-gray-600 text-center mt-4 leading-relaxed px-4">
                En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

const SpotifyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.675.465-1.028.249-2.85-1.741-6.439-2.135-10.665-1.168-.404.093-.812-.16-.905-.565-.093-.404.16-.812.565-.905 4.625-1.057 8.586-.613 11.784 1.34.353.216.465.676.249 1.029zm1.467-3.262c-.271.441-.845.582-1.286.311-3.262-2.004-8.234-2.585-12.091-1.414-.497.151-1.024-.131-1.175-.628-.151-.498.132-1.024.629-1.175 4.407-1.338 9.893-.687 13.612 1.601.44.271.582.845.311 1.286zm.134-3.376C14.928 8.1 8.163 7.873 4.241 9.064c-.615.186-1.266-.165-1.452-.779-.186-.615.166-1.266.779-1.452 4.505-1.368 12.001-1.112 16.756 1.708.553.328.738 1.037.409 1.589-.328.552-1.037.738-1.589.409z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);