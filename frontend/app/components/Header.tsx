"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useViewMode } from "../context/viewModeContext";
import { FRONT_ROUTES } from "../constants/routes";
import { BASE_UI } from "../styles/general";
import { useAuth } from "../context/authContext";
import { BadgeQuestionMark, ChartBar, Disc, Eye, Medal, Mic2, Music2, User } from "lucide-react";
import { PrimaryButton, TertiaryButton } from "./Atomic/Buttons";
import { HeaderLogo, MenuButton, MenuButtonDanger, NavButton, PopoverMenu } from "./Atomic/Nav/Navbar";
import { useSpotify } from "../context/currentlyPlayingContext";
import SpotifyLiveCard from "./small_elements/SpotifyLiveCard";
import { useLanguage } from "../context/languageContext";

// --- ICONS (SVG) ---
const Grid3x3Icon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="9.5" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="9.5" rx="1" /><rect width="5" height="5" x="9.5" y="9.5" rx="1" /><rect width="5" height="5" x="16" y="9.5" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><rect width="5" height="5" x="9.5" y="16" rx="1" /><rect width="5" height="5" x="16" y="16" rx="1" /></svg>
const GridIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>;
const ListIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>;
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const UploadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
const ChevronDown = ({ size = 16, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>

const HEADER_STYLES = {
  CONTAINER: `flex justify-between items-center sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl py-0.5 px-4 lg:px-6 border-b border-white/10`,
  
  NAV_PC: 'hidden md:flex justify-between h-fit font-semibold gap-6 lg:gap-10 2xl:gap-24 3xl:gap-32',  
  NAV_ITEM_WRAPPER: "relative group flex",

  RIGHT_SECTION: `flex justify-end items-center gap-2 lg:gap-4`,
  USER_AVATAR: `text2 ${BASE_UI.common.flexCenter} text-[13px] font-bold w-6 h-6 ${BASE_UI.rounded.badge} bg-vert/20`,
  RIGHT_WRAPPER: "relative group",
  
  MOBILE_OVERLAY: `absolute top-full left-0 w-full bg-bg1 backdrop-blur-xl border-b border-white/10 md:hidden animate-in slide-in-from-top-2`,
  MOBILE_NAV: `flex flex-col p-4 space-y-1 text-center`,
  MOBILE_ITEM: `flex gap-4 justify-center text-[16px] py-4 hover:bg-white/5 transition-colors font-medium text-white font-semibold`
};

export default function Header() {
  const router = useRouter();
  // --- ÉTATS STATIQUES ---
  const { isLoggedIn, user, logout } = useAuth();
  const { t } = useLanguage();
  const dict = t.header;
  const userName = user?.user_name || "Username";
  const { listening, localProgress } = useSpotify();
  // --- ÉTATS UI ---
  const { viewMode, toggleViewMode } = useViewMode();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  // --- MENUS DEROULANTS ---
  const containerRef = useRef<HTMLDivElement>(null);

  const navigation_menu = [
    { id: 'Rankings', label: dict.rankings, path: `${FRONT_ROUTES.MY_RANKINGS}`, icon: <Medal className="w-4 h-4 lg:w-6 lg:h-6"/> },
    { id: 'Dashboard', label: dict.dashboard, path: `${FRONT_ROUTES.DASHBOARD}`, icon: <ChartBar className="w-4 h-4 lg:w-6 lg:h-6"/> },
    { id: 'Profil public', label: dict.publicProfile, path: `${FRONT_ROUTES.PROFILE}`, icon: <Eye className="w-4 h-4 lg:w-6 lg:h-6"/> },
    { id: 'Aide', label: dict.help, path: `${FRONT_ROUTES.HELP}`, icon: <BadgeQuestionMark className="w-4 h-4 lg:w-6 lg:h-6"/> },
  ];

  const sous_menu_ranking = [
    { id: 'Tracks', label: dict.tracks, path: `${FRONT_ROUTES.MY_RANKINGS}/tracks`, icon: <Music2 size={18} /> },
    { id: 'Albums', label: dict.albums, path: `${FRONT_ROUTES.MY_RANKINGS}/albums`, icon: <Disc size={18} /> },
    { id: 'Artists', label: dict.artists, path: `${FRONT_ROUTES.MY_RANKINGS}/artists`, icon: <Mic2 size={18} /> },
  ];

  const sous_menu_compte = [
    { id: 'Profil public', label: dict.publicProfile, path: `${FRONT_ROUTES.PROFILE}`, icon: <EyeIcon /> },
    { id: 'Import de données', label: dict.import, path: `${FRONT_ROUTES.IMPORT}`, icon: <UploadIcon /> },
    { id: 'Mon compte', label: dict.myAccount, path: `${FRONT_ROUTES.ACCOUNT}`, icon: <User size={18} /> },
  ];

  const dropdown_menu = [
    { id: 'Profil public', label: dict.publicProfile, icon: <EyeIcon />, path: `${FRONT_ROUTES.PROFILE}` },
    { id: 'Mon dashboard', label: dict.dashboard, icon: <ChartBar size={18} />, path: `${FRONT_ROUTES.DASHBOARD}` },
    { id: 'Import de données', label: dict.import, icon: <UploadIcon />, path: FRONT_ROUTES.IMPORT },
    { id: 'Mon compte', label: dict.myAccount, icon: <User size={18} />, path: FRONT_ROUTES.ACCOUNT },
  ];

  const views = [
    { id: 'grid_sm', label: dict.viewGridSm, icon: <Grid3x3Icon />, hideMobile: true },
    { id: 'grid', label: dict.viewGrid, icon: <GridIcon />, hideMobile: false },
    { id: 'list', label: dict.viewList, icon: <ListIcon />, hideMobile: false },
  ] as const;

  const activeView = views.find(v => v.id === viewMode) || views[1];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setIsViewMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setIsMobileNavOpen(false);
    setIsViewMenuOpen(false);
  };

  return (
    <header className={HEADER_STYLES.CONTAINER}>
      <HeaderLogo onClick={() => navigate("/")}/>
      {/* Navigation PC */}
      <nav className={HEADER_STYLES.NAV_PC}>
        {navigation_menu.map((item) => {
          const isRankings = item.id === "Rankings";
          const isProfile = item.id === "Profil public";

          if (isRankings || isProfile) {
            const subMenu = isRankings ? sous_menu_ranking : sous_menu_compte;
            return (
              <div key={item.id} className={HEADER_STYLES.NAV_ITEM_WRAPPER}>
                <NavButton onClick={() => navigate(item.path)}>
                  {item.icon} {item.label}
                </NavButton>

                <PopoverMenu>
                  {subMenu.map(v => (
                    <MenuButton key={v.id} onClick={() => navigate(v.path)} additional="text3">
                      {v.icon} {v.label}
                    </MenuButton>
                  ))}
                </PopoverMenu>
              </div>
            );
          }

          return (
            <NavButton key={item.id} onClick={() => navigate(item.path)}>
              {item.icon} {item.label}
            </NavButton>
          );
        })}
      </nav>

      {/* DROITE : Toggles + Profil + Burger */}
      <div className={HEADER_STYLES.RIGHT_SECTION}>
        {isLoggedIn && listening.data !== null && (
          <div className={`${HEADER_STYLES.RIGHT_WRAPPER} pt-2`}>
            <TertiaryButton>
              <div className="relative flex-shrink-0">
                <img src={listening.data?.cover_url} className="w-10 h-10 rounded-xl"/>
                <div className={`shadow-lg object-cover absolute -top-1.5 -left-1.5 bg-green-500 text-[8px] px-1 font-black py-0.5 rounded-full text-black uppercase tracking-tighter shadow-xl`}>
                  {dict.live}
                </div>
              </div>
            </TertiaryButton>

            <div className="transition-all rounded-2xl shadow-2xl opacity-0 duration-200 absolute top-full left-1/2 -translate-x-1/2 z-50 overflow-hidden whitespace-nowrap invisible group-hover:opacity-100 group-hover:visible bg-bg1">
              <SpotifyLiveCard isListening={listening.is_listening} data={listening.data} currentProgress={localProgress} size='xs'/>
            </div>
          </div>
        )}

        {/* View Mode Selector */}
        <div className={HEADER_STYLES.RIGHT_WRAPPER}>
          <TertiaryButton onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
            additional="text2 flex flex-col items-center p-1 lg:p-2 justify-center"
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
          <div className={HEADER_STYLES.RIGHT_WRAPPER}>
            <TertiaryButton onClick={() => navigate(FRONT_ROUTES.ACCOUNT)} additional="text1 flex items-center gap-2 md:gap-3 bg-bg2/10 px-2 lg:px-3 py-1.5 text-sm font-medium md:hover:border-vert">
              <img src={user?.avatar} className={HEADER_STYLES.USER_AVATAR} alt="Avatar Preview"/>
              <span className="hidden lg:block max-w-[80px] truncate">{userName}</span>
            </TertiaryButton>

            <PopoverMenu additional="-ml-4">
              {dropdown_menu.map(v => (
                <MenuButton key={v.id} onClick={() => navigate(v.path)}
                  additional={`transition-all duration-300 ease-out text1`}
                >{v.icon}{v.label}</MenuButton>
              ))}
              <div className="h-[1px] bg-white/5 mx-2"/>
              <MenuButtonDanger onClick={() => logout()}
                additional={`transition-all duration-300 ease-out`}
              ><LogoutIcon/> {dict.logout}</MenuButtonDanger>
            </PopoverMenu>
          </div>
        ) : (
          <PrimaryButton onClick={() => navigate(FRONT_ROUTES.AUTH)} additional="text-[13px] font-bold px-5 py-2">
            {dict.login}
          </PrimaryButton>
        )}

        {/* BURGER BUTTON MOBILE */}
        <button className="md:hidden p-1" onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}>
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
                {item.icon} {item.label}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}