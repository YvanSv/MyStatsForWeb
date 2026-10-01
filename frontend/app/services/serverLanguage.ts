import { headers } from "next/headers";
import { languages } from "@/app/constants/locales/lang";

export type ServerLanguage = keyof typeof languages;

export const DEFAULT_LANGUAGE: ServerLanguage = "fr";

/**
 * Langue choisie d'après un en-tête Accept-Language : première langue reconnue,
 * dans l'ordre d'apparition (« en-US,en;q=0.9,fr;q=0.8 » -> « en »). Les valeurs q=0 sont ignorées.
 * Repli sur le français pour un en-tête absent, mal formé ou sans langue connue.
 */
export function pickLanguage(header: string | null | undefined): ServerLanguage {
  if (!header) return DEFAULT_LANGUAGE;
  for (const part of header.split(",")) {
    const [tag, ...params] = part.trim().split(";");
    const quality = params.map(p => p.trim()).find(p => /^q=/i.test(p));
    if (quality && !(Number(quality.slice(2)) > 0)) continue;
    const primary = tag.trim().toLowerCase().split("-")[0];
    if (Object.hasOwn(languages, primary)) return primary as ServerLanguage;
  }
  return DEFAULT_LANGUAGE;
}

/** Langue de la requête en cours (rendu serveur), déduite de Accept-Language. */
export async function getServerLanguage(): Promise<ServerLanguage> {
  try {
    return pickLanguage((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
