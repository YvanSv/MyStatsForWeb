import type { DataInfo } from "../data/DataInfos";

/** Filtres de requête : les valeurs vides (undefined, null, "") ne sont pas envoyées. */
export type QueryFilters = Record<string, unknown>;

/** Élément de classement tel que renvoyé par l'API, avant l'ajout de son type par RankingView. */
export type RankingItem = Omit<DataInfo, "type">;

/** Bornes renvoyées par l'API pour les filtres d'un classement. */
export interface RankingMetadata {
  max_streams: number;
  max_minutes: number;
  max_rating: number;
  date_min: string;
  date_max: string;
}

export interface HomeData {
  users: number;
  streams: number;
  tracks: number;
  albums: number;
  artists: number;
}

export interface TodayStats {
  nb_streams: number;
  nb_minutes: number;
}

export interface SpotifyStatus {
  is_rate_limited: boolean;
  retry_after_seconds?: number;
}

/** Réponse des routes d'import : message du backend et nombre d'écoutes ajoutées. */
export interface UploadResult {
  message?: string;
  added?: number;
  count?: number;
}

/** Profil modifiable renvoyé par la route d'édition. */
export interface EditableProfileData {
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  slug?: string | null;
  perms?: Partial<Record<"profile" | "stats" | "favorites" | "history" | "dashboard", boolean>>;
}
