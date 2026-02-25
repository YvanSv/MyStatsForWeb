import { useCallback, useState, useMemo } from "react";
import { API_ENDPOINTS } from "../config";
import { apiRequest } from "../services/api";

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  // Wrapper pour injecter le loading automatiquement
  const execute = useCallback(async (task: () => Promise<any>) => {
    setLoading(true);
    try {
      return await task();
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatus = useCallback(() => 
    execute(() => apiRequest(API_ENDPOINTS.STATUS)), [execute]);

  const register = useCallback((regData: any) => 
    execute(() => apiRequest(API_ENDPOINTS.REGISTER, { method: 'POST', body: JSON.stringify(regData) })), [execute]);

  const login = useCallback((loginData: any) => 
    execute(() => apiRequest(API_ENDPOINTS.LOGIN, { method: 'POST', body: JSON.stringify(loginData) })), [execute]);

  const updateProfile = useCallback((data: any) => 
    execute(() => apiRequest(API_ENDPOINTS.EDIT_INFOS, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    })), [execute]);

  const unlinkSpotify = useCallback(() => 
    execute(() => apiRequest(API_ENDPOINTS.UNLINK_SPOTIFY, { method: 'POST' })), [execute]);

  const getProfileData = useCallback((id: string) => 
    execute(() => apiRequest(`${API_ENDPOINTS.PROFILE_DATA}/${id}`)), [execute]);

  return useMemo(() => ({ 
    loading, 
    getStatus, 
    register, 
    login, 
    updateProfile, 
    unlinkSpotify, 
    getProfileData,
    request: apiRequest
  }), [loading, getStatus, register, login, updateProfile, unlinkSpotify, getProfileData]);
};