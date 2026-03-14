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

export interface EditableProfile {
  display_name: string;
  bio: string;
  avatar: string;
  banner: string;
}