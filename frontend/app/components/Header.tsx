"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useViewMode } from "../context/viewModeContext";
import { API_ENDPOINTS, FRONT_ROUTES } from "../config";
import { useApiMyDatas } from "../hooks/useApiMyDatas";
import { ApiStatusBadge } from "./small_elements/StatusBadge";
import GreenButton from "./small_elements/GreenButton";

export default function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userName, setUserName] = useState("null");
  const [profileURL, setProfileURL] = useState("");
  const [loading, setLoading] = useState(true);
  const { viewMode, toggleViewMode } = useViewMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { getMe } = useApiMyDatas();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const views = [
    { id: 'grid_sm', icon: <Grid3x3Icon />, hideMobile: true },
    { id: 'grid', icon: <GridIcon />, hideMobile: false },
    { id: 'list', icon: <ListIcon />, hideMobile: false },
  ] as const;

  const activeView = views.find(v => v.id === viewMode) || views[1];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setMenuOpen(false);
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setIsViewMenuOpen(false);
    };

    const checkAuth = async () => {
      try {
        const data = await getMe();
        if (data.is_logged_in) {
          setIsLoggedIn(true);
          setUserName(data.user_name);
          setProfileURL(data.profileURL);
        } else setIsLoggedIn(false);
      } catch (error) { console.error("Erreur auth:", error); setIsLoggedIn(false); }
      finally { setLoading(false); }
    };

    checkAuth();
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = () => {navigate(FRONT_ROUTES.AUTH);};
  const handleSpotifyLogin = () => {window.location.href = API_ENDPOINTS.SPOTIFY_LOGIN;};
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName("null");
    setMenuOpen(false);
    localStorage.clear(); 
    sessionStorage.clear();
    window.location.replace(API_ENDPOINTS.LOGOUT);
  };

  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
    setIsMobileNavOpen(false);
  }

  return (
    <header className="flex items-center justify-between py-3 md:py-4 px-4 md:px-6 sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl border-b border-white/5">
      {/* GAUCHE : Logo + Titre */}
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate(FRONT_ROUTES.ACCUEIL)}
      >
        <Image 
          src="/logo.png" alt="Logo" width={60} height={60} style={{ height: 'auto' }} priority
          className="w-10 md:w-16 rounded-md transition-transform group-hover:scale-105"
        />
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <span className="text-ss-titre md:text-titre font-jost text-white tracking-tighter group-hover:text-vert lg:transition-colors lg:transition-transform lg:group-hover:scale-105">
              MyStats
            </span>
        </div>
      </div>

      {/* CENTRE : Navigation (Masquée sur mobile, Burger en bas) */}
      <nav className="hidden lg:flex items-center gap-8 xl:gap-20 text-ss-titre font-jost font-semibold text-white">
        {["Tracks", "Albums", "Artists", "History"].map((item) => (
          <button key={item} onClick={() => {isLoggedIn ? navigate(`${FRONT_ROUTES.MY_RANKINGS}${item.toLowerCase()}`) : navigate(`${FRONT_ROUTES.ALL_RANKINGS}${item.toLowerCase()}`)}} className="hover:text-vert transition-all cursor-pointer">
            {item}
          </button>
        ))}
      </nav>

      {/* DROITE : Toggles + Profil + Burger */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* View Mode */}
        <div ref={containerRef} className="relative">
          {/* Bouton Principal (Affiche l'icône active) */}
          <div className="bg-bg2/50 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
            <button
              onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
              className="p-2 rounded-lg text-vert bg-white/10 hover:bg-white/15 transition-all flex flex-col items-center justify-center"
            >
              <div className="flex items-center justify-center">{activeView.icon}</div>
              <ChevronDown size={14} className={`opacity-50 transition-transform duration-300 ${isViewMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Liste déroulante */}
          {isViewMenuOpen && (
            <div className="absolute right-0 mt-2 p-1 bg-bg2 border border-white/10 rounded-xl shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex flex-col gap-1">
                {views.map((v) => (
                  <button key={v.id} onClick={() => { toggleViewMode(v.id); setIsViewMenuOpen(false); }}
                    className={`p-2 rounded-lg transition-all flex items-center gap-3 ${
                      viewMode === v.id ? 'bg-white/10 text-vert' : 'text-gray-500 hover:text-white hover:bg-white/5'
                    } ${v.hideMobile ? 'hidden lg:flex' : 'flex'}`}
                  >{v.icon}</button>
                ))}
              </div>
            </div>
          )}
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
          ) : (!loading && (
              <div className="flex items-center justify-center gap-3">
                <GreenButton texte="Se connecter" onClick={handleLogin} className="md:px-6"/>
                <GreenButton icon={SpotifyIcon} onClick={handleSpotifyLogin}/>
              </div>
            )
          )}
          {/* MENU DROPDOWN PC */}
          {menuOpen && (
            <div className="hidden lg:block absolute right-0 mt-3 w-48 bg-bg2 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 space-y-1">
                {/* 1. Profil Public (Nouveau) */}
                <button
                  onClick={() => { navigate(`${FRONT_ROUTES.PROFILE}/${profileURL}`); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 text-white"
                ><EyeIcon/>Profil public</button>
                {/* 1. Paramètres */}
                <button 
                  onClick={() => { navigate(`${FRONT_ROUTES.IMPORT}`); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 text-white"
                >
                  <UploadIcon/>Import de datas
                </button>

                {/* 2. Compte (Edit) */}
                <button 
                  onClick={() => { navigate(`${FRONT_ROUTES.ACCOUNT}`); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 text-white"
                >
                  <UserIcon/>Compte
                </button>

                <div className="h-[1px] bg-white/5 mx-2" />

                {/* 3. Déconnexion */}
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
            {["Tracks", "Albums", "Artists", "History"].map((item) => (
              <button 
                key={item} 
                onClick={() => {isLoggedIn ? navigate(`${FRONT_ROUTES.MY_RANKINGS}${item.toLowerCase()}`) : navigate(`${FRONT_ROUTES.ALL_RANKINGS}${item.toLowerCase()}`); }} 
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
            
            {/* 1. Paramètres */}
            <button 
              onClick={() => { navigate(`${FRONT_ROUTES.IMPORT}`); setMenuOpen(false); }} 
              className="flex items-center justify-center gap-3 py-2 hover:text-vert transition-colors"
            >
              <UploadIcon/> 
              <span>Importer vos données</span>
            </button>

            {/* 2. Compte */}
            <button 
              onClick={() => { navigate(`${FRONT_ROUTES.ACCOUNT}`); setMenuOpen(false); }} 
              className="flex items-center justify-center gap-3 py-2 hover:text-vert transition-colors"
            >
              <UserIcon /> 
              <span>Compte</span>
            </button>

            <div className="h-[1px] bg-white/5 mx-8" />

            {/* 3. Déconnexion */}
            <button 
              onClick={handleLogout} 
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

const Grid3x3Icon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="9.5" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="9.5" rx="1" /><rect width="5" height="5" x="9.5" y="9.5" rx="1" /><rect width="5" height="5" x="16" y="9.5" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><rect width="5" height="5" x="9.5" y="16" rx="1" /><rect width="5" height="5" x="16" y="16" rx="1" /></svg>
const GridIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>;
const ListIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>;
// const SettingsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const SpotifyIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.675.465-1.028.249-2.85-1.741-6.439-2.135-10.665-1.168-.404.093-.812-.16-.905-.565-.093-.404.16-.812.565-.905 4.625-1.057 8.586-.613 11.784 1.34.353.216.465.676.249 1.029zm1.467-3.262c-.271.441-.845.582-1.286.311-3.262-2.004-8.234-2.585-12.091-1.414-.497.151-1.024-.131-1.175-.628-.151-.498.132-1.024.629-1.175 4.407-1.338 9.893-.687 13.612 1.601.44.271.582.845.311 1.286zm.134-3.376C14.928 8.1 8.163 7.873 4.241 9.064c-.615.186-1.266-.165-1.452-.779-.186-.615.166-1.266.779-1.452 4.505-1.368 12.001-1.112 16.756 1.708.553.328.738 1.037.409 1.589-.328.552-1.037.738-1.589.409z"/></svg>;
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
const UploadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
const ChevronDown = ({ size = 16, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>