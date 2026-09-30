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
  image_url: string;
  duration_ms: number;
  isrc: string;
  release_date: string;
}

export interface MatchData {
  suggestions: SuggestionMatch[];
}

export interface CreateRequest {
  id: number;
  track_id: number;
  history_count: number;
  match_data: MatchData;
  created_at: string;
  reason?: string;
  // Jointure manuelle ou auto faite par le backend
  track?: Track;
}