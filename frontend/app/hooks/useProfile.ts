import { useState, useCallback } from "react";
import { API_ENDPOINTS } from "../constants/routes";
import { apiRequest } from "../services/api";

export const useProfile = () => {
  const [loading, setLoading] = useState(false);

  const getProfile = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await apiRequest(`${API_ENDPOINTS.PROFILE_DATA}/${id}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const getDashboard = useCallback(async (id: string, start: string | null, end: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append("start_date", start);
      if (end) params.append("end_date", end);
      return await apiRequest(`${API_ENDPOINTS.DASHBOARD_DATA}/${id}${params.toString() && `?${params.toString()}`}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { getProfile, getDashboard, loading };
};