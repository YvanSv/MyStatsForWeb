"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useViewMode } from "../context/viewModeContext";

export default function Header() {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userName, setUserName] = useState("null");
  const [loading, setLoading] = useState(true);
  const { viewMode, toggleViewMode } = useViewMode();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/auth/me", {
          method: "GET",
          credentials: "include", 
        });

        if (response.ok) {
          const data = await response.json();
          if (data.is_logged_in) {
            setIsLoggedIn(true);
            setUserName(data.user_name);
          } else {
            setIsLoggedIn(false);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'auth:", error);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {window.location.href = "http://127.0.0.1:8000/auth/login";};
  const handleLogout = () => {window.location.href = "http://127.0.0.1:8000/auth/logout";};

  return (
    <header className="flex items-center justify-between py-4 px-6 sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl border-b border-white/5">
      {/* Logo + Titre */}
      <div 
        className="flex items-center gap-4 cursor-pointer group"
        onClick={() => navigate("/")}
      >
        <Image src="/logo.png" alt="Logo" width={80} height={80} style={{ width: '80px', height: 'auto' }} priority className="rounded-md transition-transform group-hover:scale-105"/>
        <span className="text-titre font-jost text-white tracking-tighter group-hover:text-vert transition-colors transition-transform group-hover:scale-105">MyStats</span>
      </div>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-20 text-ss-titre font-jost font-semibold text-white">
        <button onClick={() => navigate("/musiques")} className="hover:text-vert transition-all cursor-pointer">
          Musiques
        </button>
        <button onClick={() => navigate("/albums")} className="hover:text-vert transition cursor-pointer">
          Albums
        </button>
        <button onClick={() => navigate("/artistes")} className="hover:text-vert transition cursor-pointer">
          Artistes
        </button>
        <button onClick={() => navigate("/historique")} className="hover:text-vert transition cursor-pointer">
          Historique
        </button>
      </nav>

      <div className="flex">
        <div className="flex bg-bg2/50 p-1 rounded-xl border border-white/5 backdrop-blur-sm mr-1">
          <button 
            onClick={() => toggleViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-vert' : 'text-gray-500 hover:text-white'}`}
            title="Vue en cases"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </button>
          <button 
            onClick={() => toggleViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-vert' : 'text-gray-500 hover:text-white'}`}
            title="Vue en ligne"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          </button>
        </div>
        {/* Bouton de connexion */}
        {isLoggedIn ? (
          <button onClick={handleLogout} className="bg-bg2 px-4 py-2 rounded-full text-sm font-medium border border-white/10 cursor-pointer hover:text-vert hover:scale-105 transition">
            Connecté en tant que <span className="font-bold">{userName}</span>
          </button>
        ) : loading ? (<header className="h-20 bg-background" />) : (
          <button onClick={handleLogin} className="bg-vert px-4 py-2 rounded-full text-sm font-bold border border-white/10 cursor-pointer text-black hover:scale-105 transition">
            Se connecter avec Spotify
          </button>
        )}
      </div>
    </header>
  );
}