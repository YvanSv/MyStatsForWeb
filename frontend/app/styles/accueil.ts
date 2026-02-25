import { GENERAL_STYLES } from "./general";

export const ACCUEIL_STYLES = {
  MAIN: "min-h-screen overflow-x-hidden",
  LOADING_SCREEN: "min-h-screen overflow-x-hidden flex items-center justify-center flex-col gap-4",
  
  // HERO SECTION
  HERO_SECTION: `${GENERAL_STYLES.FLEX_COL} relative items-center justify-center pt-12 md:pt-20 pb-16 md:pb-24 px-4 md:px-6 text-center`,
  
  // PREVIEW STATS
  PREVIEW_CONTAINER: "relative z-20 mb-12 w-full max-w-5xl animate-in fade-in slide-in-from-top-4 duration-1000",
  PREVIEW_TITLE: "text-[24px] lg:text-[32px] mb-6 md:mb-10 opacity-80",
  PREVIEW_GRID: (isLoggedIn: boolean) => `
    flex flex-wrap justify-center gap-4 md:gap-6 transition-all duration-700
    ${!isLoggedIn ? 'blur-md pointer-events-none select-none opacity-50' : ''}
  `,
  PREVIEW_ITEM: "w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)]",

  // LOCK OVERLAY
  LOCK_OVERLAY: "absolute inset-0 flex items-center justify-center z-30",
  LOCK_CARD: "bg-bg1/80 backdrop-blur-2xl border border-white/10 p-6 md:p-10 rounded-[40px] shadow-2xl w-full max-w-md",
  LOCK_TEXT: "text-lg md:text-ss-titre text-white flex flex-col items-center gap-2",
  LOCK_ICON: "text-vert text-3xl md:text-4xl mb-1",

  // HERO CONTENT
  HERO_CONTENT: "relative z-10 mt-8",
  HERO_H1: "text-4xl sm:text-5xl md:text-7xl lg:text-titre leading-tight md:leading-none tracking-tighter mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent",
  HERO_P: "text-sm md:text-ss-titre max-w-2xl text-gray-400 mb-10 leading-relaxed mx-auto px-2",
  HERO_BUTTON_GROUP: "flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center px-6 sm:px-0",
  
  // SECONDARY BUTTON
  BTN_SECONDARY: "border border-gray-700 px-8 py-4 rounded-full font-bold text-base md:text-lg hover:bg-white/5 transition-colors backdrop-blur-sm",

  // SECTIONS & GRIDS
  FEATURE_GRID: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl px-6 py-16 md:py-24 mx-auto",
  TECH_SECTION: "py-12 px-6",
  TECH_H2: "text-2xl md:text-s-titre mb-12 text-center",
  TECH_GRID: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm opacity-70 max-w-4xl mx-auto",
  TECH_BADGE: "p-4 border border-white/10 rounded-2xl bg-white/5 font-mono text-center hover:border-vert/50 transition-colors"
};

export const ACCUEIL_STATS_STYLES = {
  WRAPPER: `relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl 
    p-6 text-left cursor-default group h-full flex flex-col justify-between transition-all
    duration-300 hover:border-vert/40 hover:scale-[1.02] hover:bg-white/[0.05]
    hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]`,

  // Le label en haut
  LABEL: `text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] 
    text-vert mb-4 opacity-80 group-hover:opacity-100 transition-opacity`,
  // La valeur principale
  VALUE: `text-lg md:text-xl font-semibold mb-1 text-white group-hover:text-vert 
    transition-colors duration-300 break-words`,
  // Le sous-texte
  DETAIL: `text-xs md:text-sm text-gray-400 font-light leading-relaxed`,
  
  // L'indicateur visuel en bas à droite
  INDICATOR_WRAPPER: `flex justify-end mt-4 opacity-20 group-hover:opacity-100 
    transition-all duration-500 translate-x-2 group-hover:translate-x-0`,
  INDICATOR_BAR: `h-1 w-12 bg-vert rounded-full shadow-[0_0_10px_rgba(30,215,96,0.5)]`,
}

export const ACCUEIL_FEATURE_STYLES = {
  // L'icône avec une animation de rebond et d'échelle
  ICON: `text-4xl mb-6 inline-block group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-500 ease-out`,
  // Le titre avec une typographie marquée
  TITLE: `text-lg md:text-xl font-semibold mb-3 text-white group-hover:text-vert transition-colors duration-300`,
  // La description avec un meilleur contraste et espacement
  DESCRIPTION: `text-sm md:text-base text-gray-400 leading-relaxed font-light opacity-80 group-hover:opacity-100 transition-opacity duration-300`,
}