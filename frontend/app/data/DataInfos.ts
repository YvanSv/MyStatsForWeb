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

export interface TopStatCardProps {
  name: string;
  img_url: string;
  rating: number;
  isTrack: boolean;
  artist_name: string;
  album_name: string;
}

export interface UserProfile {
  display_name: string;
  avatar: string;
  bio: string;
  slug: string;
  banner: string;
  total_minutes: number;
  total_streams: number;
  peak_hour: number;
  top_50_tracks: any[];
  top_50_albums: any[];
  top_50_artists: any[];
  recent_tracks: any[];
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