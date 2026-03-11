"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useViewMode } from "../context/viewModeContext";
import { FRONT_ROUTES } from "../constants/routes";
import { BASE_UI, GENERAL_STYLES } from "../styles/general";
import { useAuth } from "../hooks/useAuth";
import { ChartBar, Disc, Mic2, Music2 } from "lucide-react";
import { PrimaryButton, TertiaryButton } from "./Atomic/Buttons";
import { HeaderLogo, MenuButton, MenuButtonDanger, NavButton, PopoverMenu } from "./Atomic/Nav/Navbar";

export const HEADER_STYLES = {
  CONTAINER: `flex items-center justify-between sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl py-0.5 px-4 md:px-6 border-b border-white/10`,
  
  NAV_PC: `hidden lg:flex items-center font-semibold text-[24px] gap-8 xl:gap-20`,
  NAV_ITEM_WRAPPER: "relative group py-2",

  RIGHT_SECTION: `flex items-center gap-2 md:gap-4`,

  USER_BTN: (isOpen: boolean) => `text1 flex items-center gap-2 md:gap-3 bg-bg2 px-3 md:px-4 py-2 ${BASE_UI.rounded.badge} text-sm font-medium border ${BASE_UI.anim.base} md:hover:border-vert ${isOpen ? 'border-vert' : 'border-white/10'}`,

  USER_AVATAR: `text2 ${BASE_UI.common.flexCenter} text-[13px] font-bold w-6 h-6 ${BASE_UI.rounded.badge} bg-vert/20`,
  
  MOBILE_OVERLAY: `absolute top-full left-0 w-full bg-bg1 backdrop-blur-xl border-b border-white/10 lg:hidden animate-in slide-in-from-top-2`,
  MOBILE_NAV: `flex flex-col p-4 space-y-1 text-center`,
  MOBILE_ITEM: `text-[16px] py-4 ${BASE_UI.rounded.item} hover:bg-white/5 transition-colors font-medium`
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
  const navigation_menu = [
    {id: 'Rankings', path: `${isLoggedIn ? FRONT_ROUTES.MY_RANKINGS:FRONT_ROUTES.ALL_RANKINGS}`},
    {id: 'Mon dashboard', path: `${FRONT_ROUTES.DASHBOARD}/${user?.id}`},
    {id: 'Aide', path: `${FRONT_ROUTES.HELP}`},
  ] as const;
  const sous_menu_ranking = [
    {id: 'Tracks', path: `${FRONT_ROUTES.MY_RANKINGS}/tracks`, icon: <Music2 size={18}/>},
    {id: 'Albums', path: `${FRONT_ROUTES.MY_RANKINGS}/albums`, icon: <Disc size={18}/>},
    {id: 'Artists', path: `${FRONT_ROUTES.MY_RANKINGS}/artists`, icon: <Mic2 size={18}/>},
  ]
  const views = [
    { id: 'grid_sm', icon: <Grid3x3Icon />, hideMobile: true },
    { id: 'grid', icon: <GridIcon />, hideMobile: false },
    { id: 'list', icon: <ListIcon />, hideMobile: false },
  ] as const;
  const dropdown_menu = [
    { id: 'Profil public', icon: <EyeIcon/>, path: `${FRONT_ROUTES.PROFILE}/${user?.id}` },
    { id: 'Mon dashboard', icon: <ChartBar/>, path: `${FRONT_ROUTES.DASHBOARD}/${user?.id}`},
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

  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
    setIsMobileNavOpen(false);
    setIsViewMenuOpen(false);
  };

  return (
    <header className={HEADER_STYLES.CONTAINER}>
      <HeaderLogo onClick={() => navigate("/")}/>
      {/* Navigation PC */}
      <nav className={HEADER_STYLES.NAV_PC}>
        {navigation_menu.map((item) => {
          if (item.id === "Rankings") {
            return (
              <div key={item.id} className={HEADER_STYLES.NAV_ITEM_WRAPPER}>
                <NavButton key={item.id} onClick={() => navigate(item.path)}>
                  {item.id}
                </NavButton>

                <PopoverMenu>
                  {sous_menu_ranking.map(v => (
                    <MenuButton key={v.id} onClick={() => navigate(v.path)} additional="text3">
                      {v.icon} {v.id}
                    </MenuButton>
                  ))}
                </PopoverMenu>
              </div>
            );
          }

          return (
            <NavButton key={item.id} onClick={() => navigate(item.path)}>
              {item.id}
            </NavButton>
          );
        })}
      </nav>

      {/* DROITE : Toggles + Profil + Burger */}
      <div className={HEADER_STYLES.RIGHT_SECTION}>
        {/* View Mode Selector */}
        <div className={HEADER_STYLES.NAV_ITEM_WRAPPER}>
          <TertiaryButton onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
            additional="text2 flex flex-col items-center p-2 justify-center"
          >
            <div className="flex items-center justify-center">{activeView.icon}</div>
            <ChevronDown size={14} className={`opacity-50 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`} />
          </TertiaryButton>

          <PopoverMenu>
            {views.map(v => (
              <MenuButton key={v.id} onClick={() => toggleViewMode(v.id)} additional={`duration-300 ease-out
                  ${viewMode === v.id ? `text2 bg-white/5` : `text3 hover:text-white hover:bg-white/5`}
                  ${v.hideMobile ? 'hidden lg:flex' : 'flex'}
                `}
              >{v.icon}</MenuButton>
            ))}
          </PopoverMenu>
        </div>

        {/* Profil Section */}
        {isLoggedIn ? (
          <div className={HEADER_STYLES.NAV_ITEM_WRAPPER}>
            <button onClick={() => setMenuOpen(!menuOpen)} className={HEADER_STYLES.USER_BTN(menuOpen)}>
              <div className={HEADER_STYLES.USER_AVATAR}>{userName.charAt(0).toUpperCase()}</div>
              <span className="hidden lg:block max-w-[80px] truncate">{userName}</span>
            </button>

            <PopoverMenu>
              {dropdown_menu.map(v => (
                <MenuButton key={v.id} onClick={() => navigate(v.path)}
                  additional={`transition-all duration-300 ease-out text1`}
                >{v.icon}{v.id}</MenuButton>
              ))}
              <div className="h-[1px] bg-white/5 mx-2"/>
              <MenuButtonDanger onClick={() => logout()}
                additional={`transition-all duration-300 ease-out`}
              ><LogoutIcon/>Déconnexion</MenuButtonDanger>
            </PopoverMenu>
          </div>
        ) : (
          <PrimaryButton onClick={() => navigate(FRONT_ROUTES.AUTH)} additional="text-[13px] font-bold px-5 py-2">
            Se connecter
          </PrimaryButton>
        )}

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
              <button key={item.id} className={HEADER_STYLES.MOBILE_ITEM} onClick={() => navigate(item.path)}>
                {item.id}
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