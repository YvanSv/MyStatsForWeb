export interface DataInfo {
  spotify_id?: string;
  id?: string;        // Artiste
  title?: string;     // Musique
  name?: string;      // Album/Artiste
  artist?: string;    // Musique/Album
  album?: string;     // Musique
  cover?: string;     // Musique/Album
  image_url?: string; // Artiste
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

export interface AppleCSVRow {
  "Apple ID Number": string;
  "Song Name": string;
  "Container Artist Name": string;
  "Container Album Name": string;
  "Event Start Timestamp": string;
  "Play Duration Milliseconds": string;
  "Media Duration In Milliseconds": string;
  [key: string]: string; // Pour les 140+ autres colonnes ignorées
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