export const BASE_UI = {
  text: { white: "text-white", vert: "text-vert", gray: "text-gray-500", dark: "text-bg1", red: "text-red-400" },
  common: {
    flexCenter: "flex items-center justify-center",
    glass: "bg-white/[0.03] border border-white/10 backdrop-blur-md",
    dropdown: "absolute right-0 mt-2 bg-bg2 shadow-2xl z-50 border border-white/10 rounded-xl p-1 animate-in fade-in zoom-in-95"
  },
  rounded: { card: "rounded-[32px]", badge: "rounded-full", input: "rounded-2xl", item: "rounded-xl" },
  anim: {
    base: "transition-all duration-300 ease-in-out",
    slow: "transition-all duration-500 ease-out",
    verySlow: "duration-1000",
    click: "active:scale-95 cursor-pointer",
    hoverZoom: "transition-transform hover:scale-105 duration-150",
    hoverLift: "hover:-translate-y-2 hover:border-vert/30"
  },
  typo: { tight: "tracking-tighter font-semibold", wide: "uppercase tracking-[0.25em]", hero: "tracking-tight leading-[0.9] font-bold" }
};

export const GENERAL_STYLES = {
  GREENBUTTON: `flex items-center justify-center gap-2 px-6 py-2 ${BASE_UI.anim.base} ${BASE_UI.anim.click} bg-vert ${BASE_UI.rounded.badge} font-semibold ${BASE_UI.text.dark} hover:bg-vert/90 hover:shadow-[0_0_30px_rgba(30,215,96,0.3)]`,
  GRAYBUTTON: `flex items-center justify-center gap-2 px-6 py-2 ${BASE_UI.anim.base} ${BASE_UI.anim.click} ${BASE_UI.rounded.badge} font-semibold ${BASE_UI.text.white} border border-white/10 hover:bg-white/5 hover:border-white/20`,
  GRAYBUTTON2: `${BASE_UI.text.white} bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md ${BASE_UI.rounded.input} ${BASE_UI.anim.base}`,

  TEXT1: BASE_UI.text.white,
  TEXT2: BASE_UI.text.vert,
  TEXT3: BASE_UI.text.gray,
  
  TITRE_DOUBLE_FRAME: `${BASE_UI.text.white} font-semibold mb-3 text-[16px] md:text-[24px]`,
  TRANSITION_TEXT_VERT: `transition-colors duration-300 hover:${BASE_UI.text.vert}`,
  TRANSITION_ZOOM: BASE_UI.anim.hoverZoom,
};

//// HEADER ////

export const HEADER_STYLES = {
  CONTAINER: `flex items-center justify-between sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl py-3 md:py-4 px-4 md:px-6 border-b border-white/10`,
  
  LOGO_WRAPPER: `${GENERAL_STYLES.TEXT1} ${GENERAL_STYLES.TRANSITION_TEXT_VERT} ${GENERAL_STYLES.TRANSITION_ZOOM} flex items-center ${BASE_UI.typo.tight} text-[24px] md:text-[40px] md:gap-3 cursor-pointer`,
  
  NAV_PC: `hidden lg:flex items-center font-semibold text-[24px] gap-8 xl:gap-20`,
  NAV_LINK: `${GENERAL_STYLES.TEXT1} ${GENERAL_STYLES.TRANSITION_TEXT_VERT} cursor-pointer`,

  RIGHT_SECTION: `flex items-center gap-2 md:gap-4`,

  // Dropdowns unifiés
  VIEW_DROPDOWN: `${BASE_UI.common.dropdown} min-w-[50px] duration-150`,
  MENU_DROPDOWN: `${BASE_UI.common.dropdown} w-48 ${BASE_UI.rounded.input} duration-200 lg:block`,

  VIEW_ITEM: (isActive: boolean) => `p-2 ${BASE_UI.rounded.item} ${BASE_UI.common.flexCenter} ${BASE_UI.anim.base} ${
    isActive ? `${GENERAL_STYLES.TEXT2} bg-white/10` : `${GENERAL_STYLES.TEXT3} hover:text-white hover:bg-white/5`
  }`,

  USER_BTN: (isOpen: boolean) => `${GENERAL_STYLES.TEXT1} flex items-center gap-2 md:gap-3 bg-bg2 px-3 md:px-4 py-2 ${BASE_UI.rounded.badge} text-sm font-medium border ${BASE_UI.anim.base} md:hover:border-vert ${isOpen ? 'border-vert' : 'border-white/10'}`,

  USER_AVATAR: `${GENERAL_STYLES.TEXT2} ${BASE_UI.common.flexCenter} text-[13px] font-bold w-6 h-6 ${BASE_UI.rounded.badge} bg-vert/20`,
  
  MENU_ITEM: `text-[14px] py-2.5 px-4 ${BASE_UI.rounded.item} ${BASE_UI.anim.base} gap-3 w-full flex items-center hover:bg-white/5 ${BASE_UI.text.white}`,
  MENU_ITEM_DANGER: `text-[14px] py-2.5 px-4 ${BASE_UI.rounded.item} ${BASE_UI.anim.base} gap-3 w-full flex items-center hover:bg-red-500/10 ${BASE_UI.text.red}`,
  
  MOBILE_OVERLAY: `absolute top-full left-0 w-full bg-bg1 backdrop-blur-xl border-b border-white/10 lg:hidden animate-in slide-in-from-top-2`,
};

/////////////////////////////////////////////////////////
// const titres = 'font-semibold tracking-tighter';
// const temps_transitions = 'transition-all duration-300';
// const dezoom_au_clic = `${temps_transitions} active:scale-95`;
// const alignement_greenbutton = `${dezoom_au_clic} bg-vert px-2 py-2 cursor-pointer rounded-full gap-2`;
// const couleurs_greenbutton = `font-semibold text-bg1 hover:bg-vert/90 hover:shadow-[0_0_30px_rgba(30,215,96,0.3)]`;
// const alignement_graybutton = `${dezoom_au_clic} flex flex-1 md:flex-none items-center justify-center cursor-pointer rounded-full gap-2`;
// const couleurs_graybutton = `font-semibold text-white hover:bg-white/5 border border-white/10 hover:border-white/20`;

// const color_text1 = `text-white`; // white
// const color_text2 = `text-vert`; // vert
// const color_text3 = `text-gray-500`; // gray-500
// const color_text4 = `text-bg1`; // bg1

// const transition_text_couleur_vert = `trasition-colors duration-300 hover:${color_text2}`;

// export const GENERAL_STYLES = {
//   /* BOUTONS */
//   GREENBUTTON:`${alignement_greenbutton} ${couleurs_greenbutton}`,
//   GRAYBUTTON:`${alignement_graybutton} ${couleurs_graybutton}`,
//   GRAYBUTTON2: `${color_text1} bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl transition-all`,

//   /* TEXTES */
//   TEXT1:`${color_text1}`,
//   TEXT2:`${color_text2}`,
//   TEXT3:`${color_text3}`,
//   TEXT4:`${color_text4}`,
//   TITRE_DOUBLE_FRAME: `${color_text1} font-semibold mb-3 text-[16px] md:text-[24px]`,

//   /* TRANSITIONS */
//   TRANSITION_TEXT_VERT: `${transition_text_couleur_vert}`,
//   TRANSITION_ZOOM: `transition-transform hover:scale-105 duration-150`,
// }