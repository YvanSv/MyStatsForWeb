import { useCallback, useState, useMemo } from "react";
import { API_ENDPOINTS } from "../config";

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

  const getStatus = useCallback(async () => request(`${API_ENDPOINTS.STATUS}`), [request]);

  const register = useCallback((regData: any) => 
    request(API_ENDPOINTS.REGISTER, {method: 'POST', body: regData}), [request]);
  const login = useCallback((loginData: any) => 
    request(API_ENDPOINTS.LOGIN, {method: 'POST', body: loginData}), [request]);
  const updateProfile = useCallback((data: any) => 
    request(`${API_ENDPOINTS.EDIT_INFOS}`, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
  }), [request]);

  const unlinkSpotify = useCallback(async () => request(`${API_ENDPOINTS.UNLINK_SPOTIFY}`, {method: 'POST'}), [request]);

  const getProfileData = useCallback(async (id:string) => request(`${API_ENDPOINTS.PROFILE_DATA}/${id}`), [request]);

  return useMemo(() => ({ 
    loading, request, getStatus, register, login, updateProfile, unlinkSpotify, getProfileData
  }), [loading, getStatus, register, login, updateProfile, unlinkSpotify, getProfileData]);
};