import { useLayoutEffect, useState } from "react";
import { DESKTOP_BREAKPOINT } from "../constants/ui";

/** Vrai quand la fenêtre est plus étroite que le breakpoint desktop (lecture ponctuelle, à appeler côté client). */
export const isMobileViewport = (): boolean => window.innerWidth < DESKTOP_BREAKPOINT;

// Largeur de la fenêtre, mise à jour au redimensionnement.
// Valeur initiale « desktop » (rendu serveur sûr), remplacée par la mesure réelle avant la première peinture : pas de saut visible.
export function useScreenWidth(initial = 1280) {
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}
