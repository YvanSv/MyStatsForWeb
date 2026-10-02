export interface DataInfo {
  id?: number;        // Identifiant interne (entier renvoyé par l'API)
  title?: string;     // Musique
  name?: string;      // Album/Artiste
  artist?: string;    // Musique/Album
  album?: string;     // Musique
  cover?: string | null;     // Musique/Album (null sans pochette)
  image_url?: string | null; // Artiste (null sans image)
  duration_ms?: number | null; // Musique
  play_count: number;
  total_minutes: number;
  engagement: number;
  rating: number;
  type: 'track' | 'album' | 'artist';
}

/** Élément de classement tel que renvoyé par l'API, avant l'ajout de son type par RankingView. */
export type RankingItem = Omit<DataInfo, 'type'>;

export interface TopStatCardProps {
  name: string;
  img_url: string;
  rating: number;
  isTrack: boolean;
  artist_name: string;
  album_name: string;
}

/** Élément d'un top 50 du profil public (titre, album ou artiste). */
export interface ProfileItem {
  name: string;
  album_name?: string | null;
  artist_name?: string | null;
  image_url?: string | null;
  count: number;
  minutes: number;
  engagement: number;
  rating: number;
}

/** Écoute récente affichée sur le profil public. */
export interface RecentTrack {
  id: number;
  title: string;
  artist: string;
  image_url?: string | null;
  played_at: string; // Date ISO
}

export interface UserProfile {
  display_name: string;
  avatar: string;
  bio: string;
  slug: string;
  is_special?: boolean;
  banner: string;
  total_minutes: number;
  total_streams: number;
  peak_hour: number;
  top_50_tracks: ProfileItem[];
  top_50_albums: ProfileItem[];
  top_50_artists: ProfileItem[];
  recent_tracks: RecentTrack[];
  perms: {
    profile: boolean,
    stats: boolean,
    favorites: boolean,
    history: boolean,
    dashboard: boolean
  };
}

export interface UserProfileTops {
  top_track: TopStatCardProps;
  top_artist: TopStatCardProps;
}

export interface EditableProfile {
  display_name: string;
  bio: string;
  avatar: string;
  banner: string;
}

// Colonnes de l'export Apple « Play History Daily Tracks.csv » lues par la page d'import
export interface AppleCSVRow {
  "Track Identifier": string;
  "Track Description": string; // « Artiste - Titre »
  "Date Played": string;       // AAAAMMJJ
  "Hours": string;             // heure d'écoute (0-23)
  "Play Duration Milliseconds": string; // durée cumulée pour toutes les écoutes de la ligne
  "Play Count": string;
  [key: string]: string; // Autres colonnes de l'export, ignorées
}

// Interface pour les données nettoyées envoyées au backend
export interface CleanAppleData {
  apple_track_id: string;
  song_name: string;
  artist_name: string;
  album_name?: string;
  played_at: string;
  ms_played: number;
  track_duration?: number;
}