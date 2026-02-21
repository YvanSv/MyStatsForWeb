import { useCallback, useState, useMemo } from "react";
import { ENDPOINTS } from "../config";

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
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
    const url = `${ENDPOINTS.TRACKS}?${params.toString()}`;
    console.log("🔍 URL finale envoyée :", url);
    return request(`${ENDPOINTS.TRACKS}?${params.toString()}`);
  }, [request]);

  const getArtists = useCallback(({ offset = 0, limit = 50, sort_by = 'play_count', direction = 'desc' }) =>
    request(`${ENDPOINTS.ARTISTS}?offset=${offset}&limit=${limit}&sort_by=${sort_by}&direction=${direction}`), [request]);

  const getAlbums = useCallback(({ offset = 0, limit = 50, sort_by = 'play_count', direction = 'desc' }) =>
    request(`${ENDPOINTS.ALBUMS}?offset=${offset}&limit=${limit}&sort_by=${sort_by}&direction=${direction}`), [request]);

  const getOverview = useCallback(() => request(ENDPOINTS.STATS_OVERVIEW), [request]);

  const uploadJson = useCallback((formData: FormData) =>
    request(ENDPOINTS.IMPORT_DATA, {method: 'POST', body: formData, headers: {},}), [request]);

  return useMemo(() => ({ 
    loading, getMe, getHistory, getMusics, getArtists, getAlbums, getOverview, uploadJson
  }), [loading, getMe, getHistory, getMusics, getArtists, getAlbums, getOverview, uploadJson]);
};