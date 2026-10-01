import { AppleCSVRow, CleanAppleData } from "../data/DataInfos";

// Une ligne de l'export Apple résume une heure : au plus une écoute par seconde, donc 3600 par ligne.
// Au-delà, les minutes dépasseraient 59 (date invalide) et une valeur aberrante pourrait saturer la mémoire.
export const MAX_PLAYS_PER_ROW = 3600;
// Taille maximale d'un envoi au serveur : borne le corps de chaque requête
export const UPLOAD_BATCH_SIZE = 5000;
// Seuil de Spotify lui-même : un titre n'est compté comme écouté qu'à partir de 30 s. Valeur du format de l'export Apple, indépendante des réglages de l'interface, donc volontairement hors de constants/ (en dessous, l'écoute est ignorée).
export const MIN_PLAY_MS = 30000;

/** Ligne de l'export impossible à lire : la page affiche un message traduit à partir de `kind` et `value`. */
export class AppleRowError extends Error {
  constructor(public kind: "date" | "hour", public value: string) {
    super(`${kind}: ${value}`);
  }
}

/**
 * Transforme une ligne de l'export Apple en autant d'écoutes que de lectures, réparties à la seconde dans l'heure.
 * Renvoie [] pour une ligne à ignorer (sans identifiant ou écoute trop courte) et lève une erreur pour une date ou une heure invalide.
 * La date et l'heure de l'export sont celles du fuseau du navigateur : elles sont converties en vrai UTC (suffixe « Z ») avant l'envoi,
 * pour que l'écoute tombe le bon jour côté serveur.
 */
export function appleRowToPlays(row: AppleCSVRow): CleanAppleData[] {
  const playCount = parseInt(row["Play Count"]) || 1;
  const totalMs = parseInt(row["Play Duration Milliseconds"]) || 0;
  if (!row["Track Identifier"] || Math.floor(totalMs / playCount) <= MIN_PLAY_MS) return [];
  const msPerPlay = Math.floor(totalMs / playCount);

  // Reconstruction de la date de base, validée (un mois 13 ou un jour 32 ferait rejeter tout le lot par le serveur)
  const rawDate = row["Date Played"] ?? "";
  if (!/^\d{8}$/.test(rawDate)) throw new AppleRowError("date", rawDate);
  const year = Number(rawDate.substring(0, 4));
  const month = Number(rawDate.substring(4, 6));
  const day = Number(rawDate.substring(6, 8));
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day)
    throw new AppleRowError("date", rawDate);
  const hour = parseInt(row["Hours"]) || 0;
  if (hour < 0 || hour > 23) throw new AppleRowError("hour", String(row["Hours"]));

  const description = row["Track Description"] || "";
  const parts = description.split(" - ");
  // Artiste inconnu : chaîne vide (le serveur enregistre alors le titre seul), pas un faux nom d'artiste
  const artist = parts.length > 1 ? parts[0] : "";
  const song = parts.length > 1 ? parts.slice(1).join(" - ") : description;

  const plays: CleanAppleData[] = [];
  const count = Math.min(playCount, MAX_PLAYS_PER_ROW);
  for (let i = 0; i < count; i++) {
    // Écoutes réparties seconde par seconde dans l'heure (i = 60 -> 00:01:00)
    plays.push({
      apple_track_id: String(row["Track Identifier"]),
      song_name: song,
      artist_name: artist,
      played_at: new Date(year, month - 1, day, hour, Math.floor(i / 60), i % 60).toISOString(),
      ms_played: msPerPlay,
    });
  }
  return plays;
}

/** Découpe une liste en lots d'au plus `size` éléments. */
export function toBatches<T>(items: T[], size: number = UPLOAD_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
