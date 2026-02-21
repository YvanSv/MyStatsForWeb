const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  LOGOUT:`${API_BASE_URL}/auth/logout`,
  ME: `${API_BASE_URL}/auth/me`,
  STATS_OVERVIEW: `${API_BASE_URL}/stats/overview`,
  HISTORY:`${API_BASE_URL}/spotify/history`,
  TRACKS:`${API_BASE_URL}/spotify/musics/`,
  ARTISTS:`${API_BASE_URL}/spotify/artists/`,
  ALBUMS:`${API_BASE_URL}/spotify/albums/`,
  UPLOAD_JSON:`${API_BASE_URL}/spotify/upload-json`,
  IMPORT_DATA:`${API_BASE_URL}/spotify/upload-json`,
};