"use client";

import { useCallback, useMemo } from "react";
import { API_ENDPOINTS } from "../constants/routes";
import { useApi } from "./useApi";

export const useApiMyDatas = () => {
  const { loading, request } = useApi();

  /**
   * Helper pour construire les query params de manière uniforme
   */
  const buildParams = useCallback((filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    params.set('offset', '0');
    params.set('limit', '50');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
    }

    if (!params.has('sort')) params.set('sort', 'play_count');
    if (!params.has('direction')) params.set('direction', 'desc');

    return params.toString();
  }, []);

  // --- CORE ---
  const uploadJson = useCallback((formData: FormData) =>
    request(API_ENDPOINTS.IMPORT_DATA, { method: 'POST', body: formData }), [request]);

  // --- DATA LISTS ---
  const getHistory = useCallback((offset: number, limit: number = 50) =>
    request(`${API_ENDPOINTS.HISTORY}?offset=${offset}&limit=${limit}`), [request]);

  const getTracks = useCallback((filters?: Record<string, any>) => 
    request(`${API_ENDPOINTS.TRACKS}?${buildParams(filters)}`), [request, buildParams]);

  const getArtists = useCallback((filters?: Record<string, any>) => 
    request(`${API_ENDPOINTS.ARTISTS}?${buildParams(filters)}`), [request, buildParams]);

  const getAlbums = useCallback((filters?: Record<string, any>) => 
    request(`${API_ENDPOINTS.ALBUMS}?${buildParams(filters)}`), [request, buildParams]);

  // --- METADATA ---
  const getTracksMetadata = useCallback(() => request(API_ENDPOINTS.TRACKS_METADATA), [request]);
  const getArtistsMetadata = useCallback(() => request(API_ENDPOINTS.ARTISTS_METADATA), [request]);
  const getAlbumsMetadata = useCallback(() => request(API_ENDPOINTS.ALBUMS_METADATA), [request]);

  return useMemo(() => ({
    loading, uploadJson, getHistory, getTracks, getArtists, getAlbums,
    getTracksMetadata, getArtistsMetadata, getAlbumsMetadata
  }), [
    loading, uploadJson, getHistory, getTracks, getArtists, getAlbums,
    getTracksMetadata, getArtistsMetadata, getAlbumsMetadata
  ]);
};