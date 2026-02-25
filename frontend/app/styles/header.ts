export const HEADER_STYLES = {
  // Conteneur principal fixe
  CONTAINER: `flex items-center justify-between sticky top-0 z-50 
              bg-bg1/60 backdrop-blur-xl py-3 md:py-4 px-4 md:px-6 
              border-b border-white/10`,
  
  // Logo et Titre (Gauche)
  LOGO_WRAPPER: `flex items-center tracking-tighter font-bold 
                 text-[24px] md:text-[40px] md:gap-3 cursor-pointer 
                 transition-all hover:scale-105 hover:text-vert`,
  
  // Navigation Desktop (Centre)
  NAV_PC: `hidden lg:flex items-center font-semibold text-[24px] gap-8 xl:gap-20`,
  NAV_LINK: `transition-colors hover:text-vert cursor-pointer transition-transform`,

  // Section Droite (ViewMode + Profil)
  RIGHT_SECTION: `flex items-center gap-2 md:gap-4`,

  // ViewMode Button & Dropdown
  VIEW_BOX: `border border-white/10 rounded-xl backdrop-blur-sm p-1 bg-bg2/50`,
  VIEW_BTN: `flex flex-col items-center p-2 rounded-lg bg-white/10 
             text-vert hover:bg-white/15 justify-center transition-colors`,
  VIEW_DROPDOWN: `absolute right-0 mt-2 bg-bg2 shadow-2xl z-50 
                  border border-white/10 rounded-xl p-1 min-w-[50px]
                  animate-in fade-in zoom-in-95 duration-150`,
  VIEW_ITEM: (isActive: boolean) => `p-2 rounded-lg flex items-center justify-center transition-all ${
    isActive ? 'bg-white/10 text-vert' : 'text-gray-500 hover:text-white hover:bg-white/5'
  }`,

  // Profil & Login
  USER_BTN: (isOpen: boolean) => `flex items-center gap-2 md:gap-3 bg-bg2 
                                  px-3 md:px-4 py-2 rounded-full text-sm font-medium border 
                                  transition-all md:hover:border-vert ${
                                    isOpen ? 'border-vert' : 'border-white/10'
                                  }`,
  USER_AVATAR: `flex items-center text-[13px] font-bold w-6 h-6 
                rounded-full bg-vert/20 justify-center text-vert`,
  
  // Dropdown Menu (Profil)
  MENU_DROPDOWN: `absolute right-0 mt-3 w-48 bg-bg2 rounded-2xl shadow-2xl 
                  border border-white/10 backdrop-blur-2xl overflow-hidden 
                  animate-in fade-in zoom-in-95 duration-200 lg:block`,
  MENU_ITEM: `text-[14px] py-2.5 px-4 rounded-xl transition-colors transition-transform
              gap-3 w-full flex items-center hover:bg-white/5`,
  MENU_ITEM_DANGER: `text-[14px] py-2.5 px-4 rounded-xl transition-colors 
                     gap-3 w-full flex items-center hover:bg-red-500/10 text-red-400`,
  
  // Mobile Navigation
  MOBILE_OVERLAY: `absolute top-full left-0 w-full bg-bg1 backdrop-blur-xl 
                   border-b border-white/10 lg:hidden animate-in slide-in-from-top-2`,
  MOBILE_NAV: `flex flex-col p-4 space-y-1 text-center`,
  MOBILE_ITEM: `text-[16px] py-4 rounded-xl hover:bg-white/5 transition-colors font-medium`
};