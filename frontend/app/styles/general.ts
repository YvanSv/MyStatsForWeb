const titres = 'font-semibold tracking-tighter';
const temps_transitions = 'transition-all duration-300';
const dezoom_au_clic = `${temps_transitions} active:scale-95`;
const alignement_greenbutton = `${dezoom_au_clic} bg-vert px-2 py-2 cursor-pointer rounded-full gap-2`;
const couleurs_greenbutton = `font-semibold text-bg1 hover:bg-vert/90 hover:shadow-[0_0_30px_rgba(30,215,96,0.3)]`;
const alignement_graybutton = `${dezoom_au_clic} flex flex-1 md:flex-none items-center justify-center cursor-pointer rounded-full gap-2`;
const couleurs_graybutton = `font-semibold text-white hover:bg-white/5 border border-white/10 hover:border-white/20`;

const color_text1 = `text-white`; // white
const color_text2 = `text-vert`; // vert
const color_text3 = `text-gray-500`; // gray-500
const color_text4 = `text-bg1`; // bg1

const transition_text_couleur_vert = `trasition-colors duration-300 hover:${color_text2}`;

export const GENERAL_STYLES = {
  /* BOUTONS */
  GREENBUTTON:`${alignement_greenbutton} ${couleurs_greenbutton}`,
  GRAYBUTTON:`${alignement_graybutton} ${couleurs_graybutton}`,
  GRAYBUTTON2: `${color_text1} bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl transition-all`,

  /* TEXTES */
  TEXT1:`${color_text1}`,
  TEXT2:`${color_text2}`,
  TEXT3:`${color_text3}`,
  TEXT4:`${color_text4}`,
  TITRE_DOUBLE_FRAME: `${color_text1} font-semibold mb-3 text-[16px] md:text-[24px]`,

  /* TRANSITIONS */
  TRANSITION_TEXT_VERT: `${transition_text_couleur_vert}`,
  TRANSITION_ZOOM: `transition-transform hover:scale-105 duration-150`,
}