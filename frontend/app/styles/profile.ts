export const PROFILE_STYLES = {
  MAIN_WRAPPER: "min-h-screen pb-20 bg-bg1",
  
  // BANNER
  BANNER_WRAPPER: "relative h-[300px] w-full overflow-hidden",
  BANNER_IMG: "w-full h-full object-cover opacity-50 grayscale-[20%]",
  GRADIENT_OVERLAY: "absolute inset-0 bg-gradient-to-t from-bg1 via-bg1/20 to-transparent",

  // CONTAINER & HEADER
  CONTAINER: "max-w-6xl mx-auto px-6 -mt-24 relative z-10",
  HEADER_FLEX: "flex flex-col md:flex-row items-end gap-6 mb-12",
  AVATAR: "w-40 h-40 rounded-[35px] border-4 border-bg1 bg-bg2 object-cover shadow-2xl",
  INFO_BLOCK: "flex-1 mb-4",
  NAME: "text-[40px] font-semibold text-white leading-none mb-2",
  BADGE: "text-vert font-hias tracking-[0.2em] text-sm uppercase",

  // ACTIONS
  ACTION_GROUP: "flex gap-3 mb-4",
  BTN_EDIT: "px-8 py-3 bg-vert hover:bg-vert/90 text-bg1 font-semibold rounded-2xl transition-all active:scale-95 flex items-center gap-2",
  BTN_FOLLOW: "px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95",
  BTN_SHARE: "p-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95",

  // GRIDS & CARDS
  STATS_GRID: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-12",
  RECENT_CONTAINER: "bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8",
  SECTION_TITLE: "text-2xl text-white mb-8 font-semibold",

  // TRACK ITEMS
  TRACK_ITEM: "flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-all group",
  TRACK_IMG: "w-12 h-12 rounded-lg object-cover shadow-lg",
  TRACK_NAME: "text-white font-medium group-hover:text-vert transition-colors",
  TRACK_ARTIST: "text-gray-400 text-sm",
  TRACK_DATE: "text-gray-500 text-xs font-mono"
};