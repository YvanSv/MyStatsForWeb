export interface Artist {
  id: number;
  name: string;
  image_url?: string | null;
  // Relations (si incluses dans le fetch)
  albums?: Album[];
  tracks?: Track[];
  mappings?: ArtistMapping[];
}

export interface Album {
  id: number;
  name: string;
  image_url?: string | null;
  artist_id: number;
  // Relations
  artist?: Artist;
  tracks?: Track[];
  mappings?: AlbumMapping[];
}

export interface Track {
  id: number;
  title: string;
  duration_ms?: number | null;
  artist_id: number | null; // null tant que l'artiste n'est pas identifié (import Apple Music)
  album_id?: number | null;
  // Relations
  artist?: Artist;
  album?: Album;
  history?: TrackHistory[];
  mappings?: TrackMapping[];
}

export interface TrackHistory {
  id: number;
  played_at: string; // Date ISO string
  ms_played: number;
  provider: string;
  user_id: number;
  track_id: number;
  // Optionnels (si jointure)
  track?: Track;
}

export interface ArtistMapping {
  id: number;
  provider: string; // "SPOTIFY", "APPLE_MUSIC", "MUSICBRAINZ"...
  provider_id: string;
  artist_id: number;
}

export interface AlbumMapping {
  id: number;
  provider: string;
  provider_id: string;
  album_id: number;
}

export interface TrackMapping {
  id: number;
  provider: string;
  provider_id: string;
  track_id: number;
}