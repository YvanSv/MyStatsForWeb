import { useCallback, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import { API_ENDPOINTS } from "../config";

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (task: () => Promise<any>) => {
    setLoading(true);
    try {return await task()}
    finally {setLoading(false)}
  }, []);

  const requestWithLoading = useCallback((endpoint: string, options?: RequestInit) => 
    execute(() => apiRequest(endpoint, options)), [execute]);

  const getSpotifyStatus = useCallback(() => 
    requestWithLoading(API_ENDPOINTS.SPOTIFY_STATUS), [requestWithLoading]);

  return useMemo(() => ({ 
    loading, 
    getSpotifyStatus,
    request: requestWithLoading 
  }), [loading, getSpotifyStatus, requestWithLoading]);
};