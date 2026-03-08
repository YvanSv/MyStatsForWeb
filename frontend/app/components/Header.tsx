"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useViewMode } from "../context/viewModeContext";
import { FRONT_ROUTES } from "../config";
import { GENERAL_STYLES } from "../styles/general";
import { useAuth } from "../hooks/useAuth";
import { ChartBar } from "lucide-react";

const HEADER_STYLES = {
  // Conteneur principal fixe
  CONTAINER: `flex items-center justify-between sticky top-0 z-50 
              bg-bg1/60 backdrop-blur-xl py-3 md:py-4 px-4 md:px-6 
              border-b border-white/10`,
  
  // Logo et Titre (Gauche)
  LOGO_WRAPPER: `${GENERAL_STYLES.TEXT1} ${GENERAL_STYLES.TRANSITION_TEXT_VERT} ${GENERAL_STYLES.TRANSITION_ZOOM}
                 flex items-center tracking-tighter font-bold text-[24px] md:text-[40px] md:gap-3 cursor-pointer`,
  
  // Navigation Desktop (Centre)
  NAV_PC: `hidden lg:flex items-center font-semibold text-[24px] gap-8 xl:gap-20`,
  NAV_LINK: `${GENERAL_STYLES.TEXT1} ${GENERAL_STYLES.TRANSITION_TEXT_VERT} cursor-pointer transition-transform`,

  // Section Droite (ViewMode + Profil)
  RIGHT_SECTION: `flex items-center gap-2 md:gap-4`,

  // ViewMode Button & Dropdown
  VIEW_BOX: `border border-white/10 rounded-xl backdrop-blur-sm p-1 bg-bg2/50`,
  VIEW_BTN: `${GENERAL_STYLES.TEXT2} flex flex-col items-center p-2 rounded-lg bg-white/10 
             hover:bg-white/15 justify-center transition-colors`,
  VIEW_DROPDOWN: `absolute right-0 mt-2 bg-bg2 shadow-2xl z-50 
                  border border-white/10 rounded-xl p-1 min-w-[50px]
                  animate-in fade-in zoom-in-95 duration-150`,
  VIEW_ITEM: (isActive: boolean) => `p-2 rounded-lg flex items-center justify-center transition-all ${
    isActive ? `${GENERAL_STYLES.TEXT2} bg-white/10` : `${GENERAL_STYLES.TEXT3} hover:text-white hover:bg-white/5`
  }`,

  // Profil & Login
  USER_BTN: (isOpen: boolean) => `${GENERAL_STYLES.TEXT1} flex items-center gap-2 md:gap-3 bg-bg2 
                                  px-3 md:px-4 py-2 rounded-full text-sm font-medium border 
                                  transition-all md:hover:border-vert ${
                                    isOpen ? 'border-vert' : 'border-white/10'
                                  }`,
  USER_AVATAR: `${GENERAL_STYLES.TEXT2} flex items-center text-[13px] font-bold w-6 h-6 
                rounded-full bg-vert/20 justify-center`,
  
  // Dropdown Menu (Profil)
  MENU_DROPDOWN: `absolute right-0 mt-3 w-48 bg-bg2 rounded-2xl shadow-2xl 
                  border border-white/10 backdrop-blur-2xl overflow-hidden 
                  animate-in fade-in zoom-in-95 duration-200 lg:block`,
  MENU_ITEM: `${GENERAL_STYLES.TEXT1} text-[14px] py-2.5 px-4 rounded-xl transition-colors transition-transform
              gap-3 w-full flex items-center hover:bg-white/5`,
  MENU_ITEM_DANGER: `text-[14px] py-2.5 px-4 rounded-xl transition-colors 
                     gap-3 w-full flex items-center hover:bg-red-500/10 text-red-400`,
  
  // Mobile Navigation
  MOBILE_OVERLAY: `absolute top-full left-0 w-full bg-bg1 backdrop-blur-xl 
                   border-b border-white/10 lg:hidden animate-in slide-in-from-top-2`,
  MOBILE_NAV: `flex flex-col p-4 space-y-1 text-center`,
  MOBILE_ITEM: `text-[16px] py-4 rounded-xl hover:bg-white/5 transition-colors font-medium`
};

export default function Header() {
  const router = useRouter();
  // --- ÉTATS STATIQUES ---
  const { isLoggedIn, user, logout } = useAuth();
  const userName = user?.user_name || "Username";
  // --- ÉTATS UI ---
  const { viewMode, toggleViewMode } = useViewMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  // --- MENUS DEROULANTS ---
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const views = [
    { id: 'grid_sm', icon: <Grid3x3Icon />, hideMobile: true },
    { id: 'grid', icon: <GridIcon />, hideMobile: false },
    { id: 'list', icon: <ListIcon />, hideMobile: false },
  ] as const;
  const dropdown_menu = [
    { id: 'Mon dashboard', icon: <ChartBar/>, path: `${FRONT_ROUTES.DASHBOARD}/${user?.id}`},
    { id: 'Profil public', icon: <EyeIcon/>, path: `${FRONT_ROUTES.PROFILE}/${user?.id}` },
    { id: 'Import de datas', icon: <UploadIcon/>, path: FRONT_ROUTES.IMPORT },
    { id: 'Mon compte', icon: <UserIcon/>, path: FRONT_ROUTES.ACCOUNT },
  ] as const;
  const activeView = views.find(v => v.id === viewMode) || views[1];
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setMenuOpen(false);
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setIsViewMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigation_menu = ['Tracks', 'Albums', 'Artists', 'History'] as const;

  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
    setIsMobileNavOpen(false);
    setIsViewMenuOpen(false);
  };

  return (
    <header className={HEADER_STYLES.CONTAINER}>
      {/* GAUCHE : Logo + Titre */}
      <div className={HEADER_STYLES.LOGO_WRAPPER} onClick={() => navigate(FRONT_ROUTES.ACCUEIL)}>
        <Image src="/logo.png" alt="Logo" width={60} height={60} priority className="w-10 md:w-13 h-auto" />
        MyStats
      </div>

      {/* CENTRE : Navigation PC */}
      <nav className={HEADER_STYLES.NAV_PC}>
        {navigation_menu.map(item => (
          <button key={item} onClick={() => navigate(`${isLoggedIn ? FRONT_ROUTES.MY_RANKINGS:FRONT_ROUTES.ALL_RANKINGS}/${item.toLowerCase()}`) }
            className={HEADER_STYLES.NAV_LINK}
          >{item}</button>
        ))}
      </nav>

      {/* DROITE : Toggles + Profil + Burger */}
      <div className={HEADER_STYLES.RIGHT_SECTION}>
        {/* View Mode Selector */}
        <div ref={containerRef} className="relative">
          <div className={HEADER_STYLES.VIEW_BOX}>
            <button onClick={() => setIsViewMenuOpen(!isViewMenuOpen)} className={HEADER_STYLES.VIEW_BTN}>
              <div className="flex items-center justify-center">{activeView.icon}</div>
              <ChevronDown size={14} className={`opacity-50 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isViewMenuOpen && (
            <div className={HEADER_STYLES.VIEW_DROPDOWN}>
              <div className="flex flex-col gap-1">
                {views.map((v) => (
                  <button key={v.id} onClick={() => { toggleViewMode(v.id); setIsViewMenuOpen(false); }}
                    className={`${HEADER_STYLES.VIEW_ITEM(viewMode === v.id)} ${v.hideMobile ? 'hidden lg:flex' : 'flex'}`}
                  >
                    {v.icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profil Section */}
        <div className="relative" ref={menuRef}>
          {isLoggedIn ? (
            <button onClick={() => setMenuOpen(!menuOpen)} className={HEADER_STYLES.USER_BTN(menuOpen)}>
              <div className={HEADER_STYLES.USER_AVATAR}>{userName.charAt(0).toUpperCase()}</div>
              <span className="hidden lg:block max-w-[80px] truncate">{userName}</span>
            </button>
          ) : (
            <button onClick={() => navigate(FRONT_ROUTES.AUTH)} className={`${GENERAL_STYLES.GREENBUTTON} text-[13px] font-bold px-5`}>
              Se connecter
            </button>
          )}

          {/* DROPDOWN */}
          {menuOpen && isLoggedIn && (
            <div className={HEADER_STYLES.MENU_DROPDOWN}>
              <div className="p-2 space-y-1">
                {dropdown_menu.map(v => (
                  <button key={v.id} className={HEADER_STYLES.MENU_ITEM} onClick={() => navigate(v.path)}>
                    {v.icon}{v.id}
                  </button>
                ))}
                <div className="h-[1px] bg-white/5 mx-2"/>
                <button onClick={() => logout()} className={HEADER_STYLES.MENU_ITEM_DANGER}>
                  <LogoutIcon/>Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BURGER BUTTON MOBILE */}
        <button className="lg:hidden p-2" onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}>
          <div className="space-y-1.5">
            <div className={`w-6 h-0.5 bg-white transition-all ${isMobileNavOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 bg-white ${isMobileNavOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition-all ${isMobileNavOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* MOBILE NAV OVERLAY */}
      {isMobileNavOpen && (
        <div className={HEADER_STYLES.MOBILE_OVERLAY}>
          <nav className={HEADER_STYLES.MOBILE_NAV}>
            {navigation_menu.map(item => 
              <button key={item} className={HEADER_STYLES.MOBILE_ITEM} onClick={() => navigate(`${FRONT_ROUTES.MY_RANKINGS}/${item.toLowerCase()}`)}>
                {item}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// --- ICONS (SVG) ---
const Grid3x3Icon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="9.5" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="9.5" rx="1" /><rect width="5" height="5" x="9.5" y="9.5" rx="1" /><rect width="5" height="5" x="16" y="9.5" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><rect width="5" height="5" x="9.5" y="16" rx="1" /><rect width="5" height="5" x="16" y="16" rx="1" /></svg>
const GridIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>;
const ListIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>;
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
const UploadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
const ChevronDown = ({ size = 16, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>