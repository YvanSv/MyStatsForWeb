"use client";

import { useCallback, useMemo } from "react";
import { API_ENDPOINTS } from "../config";
import { useApi } from "./useApi";

export const useApiAllDatas = () => {
  const { loading, request } = useApi();
  
  const buildParams = (filters?: Record<string, any>) => {
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
  };

  const getHistory = useCallback((offset: number, limit: number = 50) => 
    request(`${API_ENDPOINTS.ALL_HISTORY}?offset=${offset}&limit=${limit}`), 
  [request]);

  const getTracks = useCallback(async (filters?: Record<string, any>) => {
    const query = buildParams(filters);
    return request(`${API_ENDPOINTS.ALL_TRACKS}?${query}`);
  }, [request]);

  const getArtists = useCallback(async (filters?: Record<string, any>) => {
    const query = buildParams(filters);
    return request(`${API_ENDPOINTS.ALL_ARTISTS}?${query}`);
  }, [request]);

  const getAlbums = useCallback(async (filters?: Record<string, any>) => {
    const query = buildParams(filters);
    return request(`${API_ENDPOINTS.ALL_ALBUMS}?${query}`);
  }, [request]);

  const getTracksMetadata = useCallback(() => request(API_ENDPOINTS.ALL_TRACKS_METADATA), [request]);
  const getArtistsMetadata = useCallback(() => request(API_ENDPOINTS.ALL_ARTISTS_METADATA), [request]);
  const getAlbumsMetadata = useCallback(() => request(API_ENDPOINTS.ALL_ALBUMS_METADATA), [request]);

  return useMemo(() => ({
    loading,
    getHistory,
    getTracks,
    getArtists,
    getAlbums,
    getTracksMetadata,
    getArtistsMetadata,
    getAlbumsMetadata
  }), [
    loading, 
    getHistory, 
    getTracks, 
    getArtists, 
    getAlbums, 
    getTracksMetadata, 
    getArtistsMetadata, 
    getAlbumsMetadata
  ]);
};