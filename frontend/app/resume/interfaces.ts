import type { PermKey } from "../constants/validation";

export type SortOption = "streams" | "minutes" | "rating";
export type RangeOption = "day" | "month" | "season" | "year" | "lifetime";

export interface UserProfile {
    display_name: string;
    bio: string;
    avatar: string;
    banner: string;
    perms: Record<PermKey, boolean>;
}

export interface ItemBrief {
  name: string;
  minutes: number;
  rating: number;
  streams: number;
  image?: string;
}

/** Données du résumé mises à disposition des widgets (via `select` du registre) : tout DataFormat. */
export type ResumeData = DataFormat;

export interface DataFormat {
  user: UserProfile;
  topArtists: ItemBrief[];
  topTracks: ItemBrief[];
  topAlbums: ItemBrief[];
  minutes: number;
  streams: number;
  distinct_tracks: number;
  distinct_albums: number;
  distinct_artists: number;
  /** Période précédente (null : période « tout » ou aucune donnée). */
  previous_minutes?: number | null;
  previous_streams?: number | null;
  /** Séries de jours consécutifs avec au moins une écoute (null : inconnues). */
  longest_streak_days?: number | null;
  current_streak_days?: number | null;
  /** Artistes écoutés pour la première fois sur la période. */
  new_artists?: number | null;
  /** Libellé de la période affichée (« 2026 », « Été 2025 »…) : ajouté côté client, absent de la réponse de l'API. */
  periodLabel?: string | number;
}

export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "center" | "bottom";

/** Réglages communs aux cinq widgets de statistiques (minutes, streams, titres, albums, artistes). */
export interface StatWidgetSettings {
  color?: string;
  label?: string | null;
  showIcon?: boolean;
  shorten?: boolean;
}
export type MinutesWidgetSettings = StatWidgetSettings;
export type StreamsWidgetSettings = StatWidgetSettings;
export type DistinctTracksWidgetSettings = StatWidgetSettings;
export type DistinctAlbumsWidgetSettings = StatWidgetSettings;
export type DistinctArtistsWidgetSettings = StatWidgetSettings;

export type TopEntity = "tracks" | "albums" | "artists";
/** Réglages du classement « top 5 » (élément affiché : titres par défaut). */
export interface TopFiveWidgetSettings {
  entity?: TopEntity;
  color?: string;
}
export interface TopOneWidgetSettings {
  entity?: TopEntity;
  color?: string;
}
export type TextSize = "sm" | "md" | "lg";
export interface PeriodWidgetSettings {
  color?: string;
  size?: TextSize;
}
export interface FreeTextWidgetSettings {
  text?: string;
  color?: string;
  textAlign?: TextAlign;
  size?: TextSize;
}
export type ComparisonMetric = "minutes" | "streams";
export interface ComparisonWidgetSettings extends StatWidgetSettings {
  metric?: ComparisonMetric;
}
export interface StreakWidgetSettings extends StatWidgetSettings {
  /** Afficher la série en cours à la place de la plus longue. */
  showCurrent?: boolean;
}
export type NewArtistsWidgetSettings = StatWidgetSettings;
export type NowPlayingWidgetSettings = Record<string, unknown>;
export interface LogoWidgetSettings {
  opacity?: number;
}

export interface UsernameWidgetSettings {
  color?: string;
  italic?: boolean;
  uppercase?: boolean;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
}
export interface BioWidgetSettings {
  color?: string;
  /** Classe Tailwind de taille (ex. "text-[13px]"). */
  fontSize?: string;
  textAlign?: TextAlign;
  showQuotes?: boolean;
}
export interface ProfilePictureWidgetSettings {
  round?: boolean;
  border?: boolean;
  zoom?: number;
}
export interface BackgroundWidgetSettings {
  blur?: number;
  opacity?: number;
  gradient?: boolean;
}

/** Réglages de chaque type de widget, indexés par type. */
export interface WidgetSettingsMap {
  profile_picture: ProfilePictureWidgetSettings;
  username: UsernameWidgetSettings;
  background: BackgroundWidgetSettings;
  bio: BioWidgetSettings;
  minutes: MinutesWidgetSettings;
  streams: StreamsWidgetSettings;
  nb_tracks: DistinctTracksWidgetSettings;
  nb_albums: DistinctAlbumsWidgetSettings;
  nb_artists: DistinctArtistsWidgetSettings;
  top_five: TopFiveWidgetSettings;
  top_one: TopOneWidgetSettings;
  period: PeriodWidgetSettings;
  free_text: FreeTextWidgetSettings;
  comparison: ComparisonWidgetSettings;
  streak: StreakWidgetSettings;
  new_artists: NewArtistsWidgetSettings;
  now_playing: NowPlayingWidgetSettings;
  logo: LogoWidgetSettings;
}
export type WidgetType = keyof WidgetSettingsMap;
export type AnyWidgetSettings = WidgetSettingsMap[WidgetType];

/** Widget d'un type donné ; `settings` suit le type (union discriminée sur `type` pour `PlacedWidget`). */
type PlacedWidgetOf<K extends WidgetType> = {
  id: number;
  type: K;
  index: number;
  w: number;
  h: number;
  settings: WidgetSettingsMap[K];
};
type SelectedWidgetOf<K extends WidgetType> = Omit<PlacedWidgetOf<K>, "index" | "w" | "h">;

export type PlacedWidget = { [K in WidgetType]: PlacedWidgetOf<K> }[WidgetType];
export type SelectedWidget = { [K in WidgetType]: SelectedWidgetOf<K> }[WidgetType];
