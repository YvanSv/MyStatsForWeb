import { useCallback, useState, useMemo } from "react";

const API_BASE_URL = 'http://127.0.0.1:8000';

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
  const getMe = useCallback(() => request('/auth/me'), [request]);

  const getHistory = useCallback((offset: number, limit: number = 50) => 
    request(`/spotify/history?offset=${offset}&limit=${limit}`), [request]);

  const getMusics = useCallback(async ({ offset = 0, limit = 50, sort_by = 'play_count', direction = 'desc' }) =>
    request(`/spotify/musics?offset=${offset}&limit=${limit}&sort_by=${sort_by}&direction=${direction}`), [request]);

  const getArtists = useCallback(({ offset = 0, limit = 50, sort_by = 'play_count', direction = 'desc' }) =>
    request(`/spotify/artists?offset=${offset}&limit=${limit}&sort_by=${sort_by}&direction=${direction}`), [request]);

  const getAlbums = useCallback(({ offset = 0, limit = 50, sort_by = 'play_count', direction = 'desc' }) =>
    request(`/spotify/albums?offset=${offset}&limit=${limit}&sort_by=${sort_by}&direction=${direction}`), [request]);

  // On mémoïse l'objet de retour pour éviter que la déstructuration { getMusics } change
  return useMemo(() => ({ 
    loading, getMe, getHistory, getMusics, getArtists, getAlbums
  }), [loading, getMe, getHistory, getMusics, getArtists, getAlbums]);
};