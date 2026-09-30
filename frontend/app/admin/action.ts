"use client";
import { useCallback, useMemo } from "react";
import { useApi } from "../hooks/useApi";
import { API_ENDPOINTS } from "../constants/routes";

export interface TrackInfo {
  id: number;
  duration_ms: number;
  title: string;
  album_name: string;
  artist_name: string;
  history: TrackHistoryInfo[];
}

interface TrackHistoryInfo {
  id: number;
  ms_played: number;
}

export enum MusicProvider {
  SPOTIFY = "SPOTIFY",
  APPLE_MUSIC = "APPLE_MUSIC",
  ISRC = "ISRC",
  MUSICBRAINZ = "MUSICBRAINZ",
}

export enum MergeEntityType {
  ARTIST = "ARTIST",
  ALBUM = "ALBUM",
  TRACK = "TRACK",
}

export enum MergeStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
}

export type MergePriority = "low" | "medium" | "high";

export interface MergeRequest {
  id: number;
  entity_type: MergeEntityType;
  status: MergeStatus;
  priority: MergePriority;
  
  duplicate_id: number;
  duplicate_name: string;
  target_id: number;
  target_name: string;
  
  // Métadonnées
  created_at: string;
  resolved_at?: string | null;
  created_by_id?: number | null;
  reason?: string | null;
}

/**
 * Interface étendue pour l'affichage (Frontend uniquement)
 * Utile pour stocker les objets complets après un second fetch
 */
export interface MergeRequestWithDetails extends MergeRequest {
  duplicate_data?: any; // Artist | Album | Track
  target_data?: any;    // Artist | Album | Track
}

export const useApiAdmin = () => {
  const { loading, request } = useApi();

  const getTracksError = useCallback(() => request(`${API_ENDPOINTS.ERRORS}`), [request]);
  const updateTrack = useCallback((data:TrackInfo) => {
    request(API_ENDPOINTS.ERRORS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }, [request]);

  const getMergeRequests = useCallback(() => request(`${API_ENDPOINTS.MERGE_REQUESTS}`), [request]);
  const resolveMergeRequest = useCallback((id: number, approve: boolean) => {
    request(`${API_ENDPOINTS.MERGE_REQUESTS}/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    })
  }, [request]);

  const getCreateRequests = useCallback(() => request(`${API_ENDPOINTS.CREATE_REQUESTS}`), [request]);
  const resolveCreateRequest = useCallback((
    id: number, 
    approve: boolean, 
    masterIndex: number, 
    isrcs: string[]
  ) => {
    request(`${API_ENDPOINTS.CREATE_REQUESTS}/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approve, 
        master_index: masterIndex, 
        selected_isrcs: isrcs
      }),
    })
  }, [request]);

  const getCreateRequestById = useCallback((id: number) => request(`${API_ENDPOINTS.CREATE_REQUESTS}/${id}`), [request]);

  return useMemo(() => ({loading, getTracksError, updateTrack, getMergeRequests, getCreateRequests, getCreateRequestById, resolveCreateRequest}),
  [loading, getTracksError, updateTrack, getMergeRequests, getCreateRequests, getCreateRequestById, resolveCreateRequest]);
};