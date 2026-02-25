export const HEADER_STYLES = {
  /* TRANSITIONS */
  ZOOM_SURVOL: 'transition-transform hover:scale-105',
  VERT_SURVOL: 'transition-colors hover:text-vert',

  /* CONTAINERS */
  HEADER_CONTAINER: 'justify-between sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl py-3 md:py-4 px-4 md:px-6',
  HIDDEN_OR_FLEX: 'hidden lg:flex',
  HIDDEN_OR_BLOCK: 'hidden lg:block',
  OVERLAY_CONTAINER: 'absolute top-full left-0 w-full bg-bg1 lg:hidden',
  OVERLAY_NAV_CONTAINER: 'p-4 space-y-4 text-center titre-2',

  /* TEXTES */
  TITRE: 'tracking-tighter font-bold text-[24px] md:text-[40px]',
  TITRE_NAV: 'font-semibold text-[24px]',
  TEXTE_BASE: 'text-[13px] font-bold',

  /* BORDERS */
  BORDER_WHITE: 'border border-white/10',
  BORDER_BOTTOM_WHITE: 'border-b border-white/10',
  LIGNE_BLANCHE: 'h-[1px] bg-white/5 mx-2',

  /* VIEWMODE BUTTONS */
  VIEWMODE_BUTTON: 'rounded-xl backdrop-blur-sm p-1',
  VIEWMODE_HOVER: 'bg-white/10 text-vert',

  /* OVERLAYS TELEPHONE*/
  OPTION_OVERLAY: 'text-[14px] py-2 rounded-xl transition-colors gap-3 w-full',
  OPTION_OVERLAY_SAFE: 'hover:bg-white/5 px-4',
  OPTION_OVERLAY_DANGER: 'px-4 hover:bg-red-500/10 text-red-400',
}