export const PROFILE_EDIT_STYLES = {
  MAIN: "min-h-screen pb-20 bg-bg1",
  BANNER_EDIT: "relative h-[250px] w-full group cursor-pointer overflow-hidden bg-bg2",
  BANNER_IMG: "w-full h-full object-cover opacity-40 transition-opacity group-hover:opacity-30",
  
  CONTAINER: "max-w-4xl mx-auto px-6 -mt-20 relative z-10",
  
  // Avatar Edit
  AVATAR_WRAPPER: "relative w-40 h-40 group cursor-pointer mx-auto md:mx-0",
  AVATAR_IMG: "w-full h-full rounded-[35px] border-4 border-bg1 bg-bg2 object-cover shadow-2xl transition-all group-hover:brightness-50",
  OVERLAY_ICON: "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white",

  // Form
  FORM_CARD: "bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 mt-12",
  LABEL: "block text-gray-400 text-xs font-hias uppercase tracking-widest mb-2 ml-1",
  INPUT: "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-vert/50 transition-all mb-6",
  
  // Footer Actions
  FOOTER: "flex items-center justify-end gap-4 mt-10",
  BTN_SAVE: "px-10 py-3 bg-vert hover:bg-vert/90 text-bg1 font-bold rounded-2xl transition-all active:scale-95",
  BTN_CANCEL: "px-6 py-3 text-gray-400 hover:text-white transition-colors"
};