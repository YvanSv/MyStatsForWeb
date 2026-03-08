export const BASE_UI = {
  text: { white: "text-white", vert: "text-vert", gray: "text-gray-500", dark: "text-bg1", red: "text-red-400" },
  common: {
    flexCenter: "flex items-center justify-center",
    glass: "bg-white/[0.03] border border-white/10 backdrop-blur-md",
    dropdown: "absolute right-0 mt-2 bg-bg2 shadow-2xl z-50 border border-white/10 rounded-xl p-1 animate-in fade-in zoom-in-95"
  },
  rounded: { card: "rounded-[32px]", badge: "rounded-full", input: "rounded-2xl", item: "rounded-xl", large: "rounded-[40px]", medium: "rounded-[30px]"},
  anim: {
    base: "transition-all duration-300 ease-in-out",
    slow: "transition-all duration-500 ease-out",
    verySlow: "duration-1000",
    click: "active:scale-95 cursor-pointer",
    hoverZoom: "transition-transform hover:scale-105 duration-150",
    hoverLift: "hover:-translate-y-2 hover:border-vert/30"
  },
  typo: { tight: "tracking-tighter font-semibold", wide: "uppercase tracking-[0.25em]", hero: "tracking-tight leading-[0.9] font-bold" },
  layout: {
    flexCenter: "flex items-center justify-center",
    col: "flex flex-col",
  }
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