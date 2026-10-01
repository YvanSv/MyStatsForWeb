"use client";

import { useCallback, useMemo } from "react";
import { API_ENDPOINTS } from "../constants/routes";
import { useApi } from "./useApi";
import { DEFAULT_DIRECTION, DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE, DEFAULT_SORT } from "../constants/ui";

export const useApiAllDatas = () => {
  const { loading, request } = useApi();
  
  const buildParams = (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    params.set('offset', String(DEFAULT_PAGE_OFFSET));
    params.set('limit', String(DEFAULT_PAGE_SIZE));
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
    }
    
    if (!params.has('sort')) params.set('sort', DEFAULT_SORT);
    if (!params.has('direction')) params.set('direction', DEFAULT_DIRECTION);
    
    return params.toString();
  };

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
  const getHomeData = useCallback(() => request(API_ENDPOINTS.HOME_DATA), [request]);

  return useMemo(() => ({
    loading,
    getTracks,
    getArtists,
    getAlbums,
    getTracksMetadata,
    getArtistsMetadata,
    getAlbumsMetadata,
    getHomeData
  }), [
    loading, 
    getTracks, 
    getArtists, 
    getAlbums, 
    getTracksMetadata, 
    getArtistsMetadata, 
    getAlbumsMetadata,
    getHomeData
  ]);
};