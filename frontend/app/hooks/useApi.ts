import { useCallback, useMemo, useRef, useState } from "react";
import { apiRequest, type ApiRequestOptions } from "../services/api";
import { API_ENDPOINTS } from "../constants/routes";
import type { SpotifyStatus } from "./apiTypes";

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  // Nombre de requêtes en cours : loading ne retombe à false qu'une fois toutes terminées
  const pending = useRef(0);

  const execute = useCallback(async <T>(task: () => Promise<T>): Promise<T> => {
    pending.current += 1;
    setLoading(true);
    try {return await task()}
    finally {
      pending.current -= 1;
      setLoading(pending.current > 0);
    }
  }, []);

  const requestWithLoading = useCallback(<T = unknown>(endpoint: string, options?: ApiRequestOptions) => 
    execute(() => apiRequest<T>(endpoint, options)), [execute]);

  const getSpotifyStatus = useCallback(() => 
    requestWithLoading<SpotifyStatus>(API_ENDPOINTS.SPOTIFY_STATUS), [requestWithLoading]);

  return useMemo(() => ({ 
    loading, 
    getSpotifyStatus,
    request: requestWithLoading 
  }), [loading, getSpotifyStatus, requestWithLoading]);
};