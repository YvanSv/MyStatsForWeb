import { useCallback, useState } from "react";

const API_BASE_URL = 'http://127.0.0.1:8000';

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {'Content-Type': 'application/json',...options.headers},
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Une erreur est survenue');
      }
      return await response.json();
    } catch (error) { console.error(`API Error [${endpoint}]:`, error); throw error; }
    finally { setLoading(false); }
  }, []);

  // Définition de tes méthodes spécifiques
  const getRecentlyPlayed = (offset: number, limit: number = 50) => 
    request(`/spotify/recently-played?offset=${offset}&limit=${limit}`);

  const getMe = () => request('/auth/me');

  const getMusics = (offset: number, limit: number = 50) =>
    request(`/spotify/musics?offset=${offset}&limit=${limit}`);

  // Tu pourras ajouter plus tard :
  // const getTopArtists = () => request('/spotify/top-artists');

  return { loading, getRecentlyPlayed, getMe, getMusics };
};