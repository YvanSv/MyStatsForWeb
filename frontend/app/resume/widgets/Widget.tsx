import { JSX } from "react";

export type LayoutKey = `${number}x${number}`;

interface WidgetProps {
  w: number;
  h: number;
  layouts: Partial<Record<LayoutKey, JSX.Element>>;
}

export default function Widget({w,h,layouts}:WidgetProps) {
  const currentKey: LayoutKey = `${w}x${h}`;

  if (layouts[currentKey]) return layouts[currentKey];
  
  // Logique de Fallback "Intelligente"
  // On définit l'ordre de priorité des replis pour les formats carrés
  const squareFallbacks: LayoutKey[] = ["3x3", "2x2", "1x1"];

  // Si on est sur un grand format (w >= 2 et h >= 2), on cherche le carré le plus proche
  if (w >= 2 && h >= 2) {
    for (const key of squareFallbacks) {
      if (layouts[key]) return layouts[key];
    }
  }

  // Si c'est un format horizontal (ex: 3x1) mais vide -> on cherche 2x1 puis 1x1
  if (w > h) {
    if (layouts[`${w - 1}x${h}` as LayoutKey]) return layouts[`${w - 1}x${h}` as LayoutKey];
    if (layouts["1x1"]) return layouts["1x1"];
  }

  // Si c'est un format vertical (ex: 1x4) mais vide -> on cherche 1x3, 1x2 puis 1x1
  if (h > w) {
    if (layouts[`${w}x${h - 1}` as LayoutKey]) return layouts[`${w}x${h - 1}` as LayoutKey];
    if (layouts["1x1"]) return layouts["1x1"];
  }

  // 1x1, sinon rien
  return layouts["1x1"] || <div className="w-full h-full bg-neutral-900/50 rounded-xl" />;
}