import { useCallback, useMemo } from "react";
import { API_ENDPOINTS } from "../config";
import { useApi } from "./useApi";

export const useApiMyDatas = () => {
	const { loading, request } = useApi();

	const getMe = useCallback(() => request(API_ENDPOINTS.ME), [request]);

  const getHistory = useCallback((offset: number, limit: number = 50) => 
    request(`${API_ENDPOINTS.HISTORY}?offset=${offset}&limit=${limit}`), [request]);

  const getTracks = useCallback(async (filters: Record<string, any>) => {
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
    return request(`${API_ENDPOINTS.TRACKS}?${params.toString()}`);
  }, [request]);

  const getArtists = useCallback(async (filters: Record<string, any>) => {
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
    return request(`${API_ENDPOINTS.ARTISTS}?${params.toString()}`);
  }, [request]);

  const getAlbums = useCallback(async (filters: Record<string, any>) => {
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
    return request(`${API_ENDPOINTS.ALBUMS}?${params.toString()}`);
  }, [request]);

	const uploadJson = useCallback((formData: FormData) =>
    request(API_ENDPOINTS.IMPORT_DATA, {method: 'POST', body: formData}), [request]);

  const getTracksMetadata = useCallback(async () => request(`${API_ENDPOINTS.TRACKS_METADATA}`), [request]);
  const getArtistsMetadata = useCallback(async () => request(`${API_ENDPOINTS.ARTISTS_METADATA}`), [request]);
  const getAlbumsMetadata = useCallback(async () => request(`${API_ENDPOINTS.ALBUMS_METADATA}`), [request]);

  const getOverview = useCallback(() => request(API_ENDPOINTS.STATS_OVERVIEW), [request]);

	return useMemo(() => ({
		loading, getMe, getHistory, getTracks, getArtists, getAlbums, getTracksMetadata, getArtistsMetadata, getAlbumsMetadata, uploadJson, getOverview
	}), [loading, getMe, getHistory, getTracks, getArtists, getAlbums, getTracksMetadata, getArtistsMetadata, getAlbumsMetadata, uploadJson, getOverview])
}