import type { DataInfo } from "../data/DataInfos";
import type { CumulativePoint, HourlyData, MonthPoint, WeekdayPoint, YearPoint } from "../profile/dashboard/[id]/utils";

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

export type ItemType = "track" | "album" | "artist";

export interface ItemRef { id: number; name: string }

/** Élément enfant (titre d'un album, titre ou album d'un artiste) avec ses statistiques sur la période. */
export interface DetailChild {
  id: number;
  name: string;
  image: string | null;
  streams: number;
  minutes: number;
  rating: number | null;
}

/** Réponse de GET /data/my/{entity}/{id}/detail (statistiques de l'utilisateur connecté sur un élément). */
export interface ItemDetail {
  entity: {
    type: ItemType;
    id: number;
    name: string;
    image: string | null;
    artist: ItemRef | null;
    album: ItemRef | null;
  };
  stats: {
    streams: number;
    minutes: number;
    rating: number | null;
    first_played_at: string | null;
    last_played_at: string | null;
    active_days: number;
    avg_minutes_per_active_day: number;
    /** Part des streams totaux de l'utilisateur, en pourcentage (0 à 100). */
    share_of_total_streams: number;
    rank: { streams: number | null; minutes: number | null; rating: number | null; out_of: number };
  };
  charts: {
    hourly: HourlyData[];
    weekly: WeekdayPoint[];
    monthly: MonthPoint[];
    annual: YearPoint[];
    cumulative: CumulativePoint[];
  };
  children: { tracks: DetailChild[] | null; albums: DetailChild[] | null };
  recent_plays: { played_at: string; ms_played: number }[];
}
