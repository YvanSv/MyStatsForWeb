import { useState } from "react";
import { API_ENDPOINTS } from "../config";
import { apiRequest } from "../services/api";

export const useProfile = () => {
  const [loading, setLoading] = useState(false);

  const getProfile = async (id: string) => {
    setLoading(true);
    try {
      return await apiRequest(`${API_ENDPOINTS.PROFILE_DATA}/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return { getProfile, loading };
};