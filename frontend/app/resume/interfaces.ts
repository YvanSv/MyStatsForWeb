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
