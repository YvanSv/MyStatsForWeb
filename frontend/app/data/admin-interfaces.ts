import { Track } from "./interfaces";

export interface MergeRequest {
  id: number;
  entity_type: "ARTIST" | "ALBUM" | "TRACK";
  status: "PENDING" | "COMPLETED" | "REJECTED";
  priority: "low" | "medium" | "high";
  duplicate_id: number;
  target_id: number;
  created_at: string;
  reason?: string;
}

export interface SuggestionMatch {
  id: string;
  title: string;
  length?: number;
  artist: string;
  artist_id: string;
  album: string;
  album_id: string;
  image_url: string | null;    // null quand l'album n'a pas de pochette
  duration_ms: number;
  isrc: string | null;         // absent chez Spotify pour certains titres
  release_date: string | null;
}

export interface MatchData {
  suggestions: SuggestionMatch[];
}

export interface CreateRequest {
  id: number;
  track_id: number;
  history_count?: number; // fourni par la liste uniquement, pas par le détail
  match_data: MatchData;
  created_at: string;
  reason?: string;
  // Jointure manuelle ou auto faite par le backend
  track?: Track;
}