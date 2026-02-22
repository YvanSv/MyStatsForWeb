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