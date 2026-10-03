"use client";

import { useCallback, useMemo } from "react";
import { API_ENDPOINTS } from "../constants/routes";
import { useApi } from "./useApi";
import type { ItemDetail, ItemType, QueryFilters, RankingItem, RankingMetadata, TodayStats } from "./apiTypes";
import { pathSegment } from "../services/url";
import type { DataFormat } from "../resume/interfaces";
import { DEFAULT_DIRECTION, DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE, DEFAULT_SORT } from "../constants/ui";

export const useApiMyDatas = () => {
  const { loading, request } = useApi();

  /**
   * Helper pour construire les query params de manière uniforme
   */
  const buildParams = useCallback((filters?: QueryFilters) => {
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
  }, []);

  // --- CORE ---
  // const uploadJson = useCallback((formData: FormData) =>
  //   request(API_ENDPOINTS.SPOTIFY_IMPORT, { method: 'POST', body: formData }), [request]);

  // --- DATA LISTS ---
  const getTracks = useCallback((filters?: QueryFilters) => 
    request<RankingItem[]>(`${API_ENDPOINTS.TRACKS}?${buildParams(filters)}`), [request, buildParams]);

  const getArtists = useCallback((filters?: QueryFilters) => 
    request<RankingItem[]>(`${API_ENDPOINTS.ARTISTS}?${buildParams(filters)}`), [request, buildParams]);

  const getAlbums = useCallback((filters?: QueryFilters) => 
    request<RankingItem[]>(`${API_ENDPOINTS.ALBUMS}?${buildParams(filters)}`), [request, buildParams]);

  // --- METADATA ---
  const getTracksMetadata = useCallback(() => request<RankingMetadata>(API_ENDPOINTS.TRACKS_METADATA), [request]);
  const getArtistsMetadata = useCallback(() => request<RankingMetadata>(API_ENDPOINTS.ARTISTS_METADATA), [request]);
  const getAlbumsMetadata = useCallback(() => request<RankingMetadata>(API_ENDPOINTS.ALBUMS_METADATA), [request]);

  const refreshUserData = useCallback(() => request(API_ENDPOINTS.REFRESH_USER_DATA), [request]);
  const getTodayStats = useCallback(() => request<TodayStats>(API_ENDPOINTS.TODAY_STATS), [request]);
  const getResumeStats = useCallback((filters?: QueryFilters) => request<DataFormat>(`${API_ENDPOINTS.SHARE}?${buildParams(filters)}`), [request, buildParams]);

  /** Statistiques détaillées d'un élément de l'utilisateur sur une période (bornes ISO ; absentes = tout l'historique). */
  const getItemDetail = useCallback((type: ItemType, id: string | number, start?: string | null, end?: string | null) => {
    const params = new URLSearchParams();
    if (start) params.set("start_date", start);
    if (end) params.set("end_date", end);
    const query = params.toString();
    const url = API_ENDPOINTS.ITEM_DETAIL.replace("{entity}", `${type}s`).replace("{id}", pathSegment(id));
    return request<ItemDetail>(query ? `${url}?${query}` : url);
  }, [request]);

  return useMemo(() => ({
    loading, getItemDetail, getTracks, getArtists, getAlbums, getResumeStats,
    getTracksMetadata, getArtistsMetadata, getAlbumsMetadata, refreshUserData, getTodayStats
  }), [
    loading, getItemDetail, getTracks, getArtists, getAlbums, getResumeStats,
    getTracksMetadata, getArtistsMetadata, getAlbumsMetadata, refreshUserData, getTodayStats
  ]);
};