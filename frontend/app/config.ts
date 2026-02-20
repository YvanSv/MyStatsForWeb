export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  LOGOUT:`${API_BASE_URL}/auth/logout`,
  ME: `${API_BASE_URL}/auth/me`,
  STATS_OVERVIEW: `${API_BASE_URL}/stats/overview`,
  UPLOAD_JSON:`${API_BASE_URL}/spotify/upload-json`,
};