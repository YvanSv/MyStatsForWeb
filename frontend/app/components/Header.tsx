"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useViewMode } from "../context/viewModeContext";
import { ENDPOINTS } from "../config";
import { useApi } from "../hooks/useApi";
import { ApiStatusBadge } from "./StatusBadge";

export default function Header() {
  const router = useRouter();
  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
  }
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userName, setUserName] = useState("null");
  const [loading, setLoading] = useState(true);
  const { viewMode, toggleViewMode } = useViewMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { getMe } = useApi();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await getMe();
        if (data.is_logged_in) {
          setIsLoggedIn(true);
          setUserName(data.user_name);
        }
      } catch (error) { console.error("Erreur auth:", error); }
      finally { setLoading(false); }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {window.location.href = ENDPOINTS.LOGIN;};
  const handleLogout = () => {window.location.href = ENDPOINTS.LOGOUT;};

  return (
    <header className="flex items-center justify-between py-3 md:py-4 px-4 md:px-6 sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl border-b border-white/5">
      {/* GAUCHE : Logo + Titre */}
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate("/")}
      >
        <Image 
          src="/logo.png" alt="Logo" width={60} height={60} style={{ height: 'auto' }} priority
          className="w-10 md:w-16 rounded-md transition-transform group-hover:scale-105"
        />
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <span className="text-xl md:text-titre font-jost text-white tracking-tighter group-hover:text-vert transition-colors">
              MyStats
            </span>
            <div className="hidden md:block"><ApiStatusBadge/></div>
        </div>
      </div>

      {/* CENTRE : Navigation (Masquée sur mobile, Burger en bas) */}
      <nav className="hidden lg:flex items-center gap-8 xl:gap-20 text-ss-titre font-jost font-semibold text-white">
        {["Musiques", "Albums", "Artistes", "Historique"].map((item) => (
          <button key={item} onClick={() => navigate(`/${item.toLowerCase()}`)} className="hover:text-vert transition-all cursor-pointer">
            {item}
          </button>
        ))}
      </nav>

      {/* DROITE : Toggles + Profil + Burger */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* View Mode */}
        <div className={`${isLoggedIn ? "" : "hidden md:block"} bg-bg2/50 p-1 rounded-xl border border-white/5 backdrop-blur-sm sm:flex`}>
          <button onClick={() => toggleViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-vert' : 'text-gray-500 hover:text-white'}`}>
            <GridIcon />
          </button>
          <button onClick={() => toggleViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-vert' : 'text-gray-500 hover:text-white'}`}>
            <ListIcon />
          </button>
        </div>

        {/* Profil */}
        <div className="relative" ref={menuRef}>
          {isLoggedIn ? (
            <button 
                onClick={() => {setMenuOpen(!menuOpen); setIsMobileNavOpen(false);}}
                className={`flex items-center gap-2 md:gap-3 bg-bg2 px-3 md:px-4 py-2 rounded-full text-sm font-medium border transition-all ${menuOpen ? 'border-vert' : 'border-white/10'}`}
            >
                <div className="w-6 h-6 rounded-full bg-vert/20 flex items-center justify-center text-vert font-bold text-[10px]">
                    {userName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block max-w-[80px] truncate">{userName}</span>
            </button>
          ) : (
            !loading && (
              <button onClick={handleLogin} className="bg-vert px-4 md:px-6 py-2 rounded-full text-xs md:sm font-bold text-black transition active:scale-95">
                Login
              </button>
            )
          )}
          {/* MENU DROPDOWN PC */}
          {menuOpen && (
            <div className="hidden lg:block absolute right-0 mt-3 w-48 bg-bg2 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 space-y-1">
                <button 
                  onClick={() => navigate("/settings")}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3"
                >
                  <SettingsIcon/>Paramètres
                </button>
                <div className="h-[1px] bg-white/5 mx-2" />
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 rounded-xl transition-colors flex items-center gap-3"
                >
                  <LogoutIcon/>Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BURGER BUTTON (Visible uniquement sur mobile/tablette) */}
        <button 
          className="lg:hidden p-2 text-white"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
        >
          <div className="space-y-1.5">
            <div className={`w-6 h-0.5 bg-white transition-all ${isMobileNavOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 bg-white ${isMobileNavOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition-all ${isMobileNavOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* MOBILE OVERLAY MENU NAVIGATION */}
      {isMobileNavOpen && (
        <div className="absolute top-full left-0 w-full bg-bg1 border-b border-white/10 lg:hidden animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col p-4 space-y-4 text-center font-jost font-semibold text-white">
            {["Musiques", "Albums", "Artistes", "Historique"].map((item) => (
              <button 
                key={item} 
                onClick={() => { navigate(`/${item.toLowerCase()}`); setIsMobileNavOpen(false); }} 
                className="py-2 hover:text-vert"
              >
                {item}
              </button>
            ))}
            <div className="pt-4 border-t border-white/5 flex justify-center">
                <ApiStatusBadge />
            </div>
          </nav>
        </div>
      )}

      {/* MOBILE OVERLAY MENU */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-bg1 border-b border-white/10 lg:hidden animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col p-4 space-y-4 font-jost font-semibold text-white">
            
            {/* Bouton Paramètres */}
            <button 
              onClick={() => { navigate(`/settings`); setMenuOpen(false); }} 
              className="flex items-center justify-center gap-3 py-2 hover:text-vert transition-colors"
            >
              <SettingsIcon /> 
              <span>Paramètres</span>
            </button>

            <div className="h-[1px] bg-white/5 mx-8" />

            {/* Bouton Déconnexion */}
            <button 
              onClick={() => { setMenuOpen(false); handleLogout(); }} 
              className="flex items-center justify-center gap-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogoutIcon /> 
              <span>Déconnexion</span>
            </button>

          </nav>
        </div>
      )}
    </header>
  );
}

const GridIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>;
const ListIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>;
const SettingsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;