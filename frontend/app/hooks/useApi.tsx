import { useCallback, useState, useMemo } from "react";
import { ENDPOINTS } from "../config";

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type'))
      headers.set('Content-Type', 'application/json');

    try {
      const response = await fetch(`${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: headers,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Une erreur est survenue');
      }
      return await response.json();
    } catch (error) { console.error(`API Error [${endpoint}]:`, error); throw error; }
    finally { setLoading(false); }
  }, []);

  // Stabilisation des méthodes individuelles
  const getMe = useCallback(() => request(ENDPOINTS.ME), [request]);

  const getHistory = useCallback((offset: number, limit: number = 50) => 
    request(`${ENDPOINTS.HISTORY}?offset=${offset}&limit=${limit}`), [request]);

  const getMusics = useCallback(async (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    params.set('offset', '0');
    params.set('limit', '50');
    params.set('sort_by', 'play_count');
    params.set('direction', 'desc');
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                params.set(key, String(value));
            }
        });
    }
    return request(`${ENDPOINTS.TRACKS}?${params.toString()}`);
  }, [request]);

  const getArtists = useCallback(async (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    params.set('offset', '0');
    params.set('limit', '50');
    params.set('sort_by', 'play_count');
    params.set('direction', 'desc');
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                params.set(key, String(value));
            }
        });
    }
    return request(`${ENDPOINTS.ARTISTS}?${params.toString()}`);
  }, [request]);

  const getAlbums = useCallback(async (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    params.set('offset', '0');
    params.set('limit', '50');
    params.set('sort_by', 'play_count');
    params.set('direction', 'desc');
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                params.set(key, String(value));
            }
        });
    }
    return request(`${ENDPOINTS.ALBUMS}?${params.toString()}`);
  }, [request]);

  const getOverview = useCallback(() => request(ENDPOINTS.STATS_OVERVIEW), [request]);

  const uploadJson = useCallback((formData: FormData) =>
    request(ENDPOINTS.IMPORT_DATA, {method: 'POST', body: formData}), [request]);

  const getMusicsMetadata = useCallback(async () => request(`${ENDPOINTS.MUSICS_METADATA}`), [request]);
  const getArtistsMetadata = useCallback(async () => request(`${ENDPOINTS.ARTISTS_METADATA}`), [request]);
  const getAlbumsMetadata = useCallback(async () => request(`${ENDPOINTS.ALBUMS_METADATA}`), [request]);

  const getStatus = useCallback(async () => request(`${ENDPOINTS.STATUS}`), [request]);

  return useMemo(() => ({ 
    loading, getMe, getHistory, getMusics, getArtists, getAlbums, getOverview, uploadJson, getMusicsMetadata, getArtistsMetadata, getAlbumsMetadata, getStatus
  }), [loading, getMe, getHistory, getMusics, getArtists, getAlbums, getOverview, uploadJson, getMusicsMetadata, getArtistsMetadata, getAlbumsMetadata, getStatus]);
};