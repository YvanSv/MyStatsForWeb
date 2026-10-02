import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, RESERVED_SLUGS, SLUG_MAX } from "../constants/validation";

export type SlugError = "numeric" | "reserved" | "length" | null;
export type ImageError = "type" | "size" | null;

// Normalisation seulement : les valeurs invalides sont signalées par une erreur, pas ignorées
export function normalizeSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function slugError(slug: string): SlugError {
  if (/^\d+$/.test(slug)) return "numeric";
  if (RESERVED_SLUGS.includes(slug)) return "reserved";
  if (slug.length > SLUG_MAX) return "length";
  return null;
}

// Mêmes règles que le serveur, qui revérifie de toute façon
export function imageError(file: { type: string; size: number }): ImageError {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}
