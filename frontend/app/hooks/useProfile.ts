import { useState, useCallback } from "react";
import { API_ENDPOINTS } from "../constants/routes";
import { apiRequest } from "../services/api";
import { pathSegment } from "../services/url";
import { EditableProfile } from "../data/DataInfos";

export const useProfile = () => {
  const [loading, setLoading] = useState(false);

  const getProfile = useCallback(async (id: string) => {
    setLoading(true);
    try {return await apiRequest(`${API_ENDPOINTS.PROFILE_DATA}/${pathSegment(id)}`)}
    finally {setLoading(false)}
  }, []);

  const getTopDataProfile = useCallback(async (id: string) => {
    setLoading(true);
    try {return await apiRequest(`${API_ENDPOINTS.PROFILE_DATA_TOPS}/${pathSegment(id)}`)}
    finally {setLoading(false)}
  }, []);

  const getEditableProfile = useCallback(async (id: string) => {
    setLoading(true);
    try {return await apiRequest(`${API_ENDPOINTS.EDITABLE_PROFILE_DATA}/${pathSegment(id)}`)}
    finally {setLoading(false)}
  }, []);

  const patchProfile = useCallback(async (id: string, data: Partial<EditableProfile>) => {
    setLoading(true);
    try {
      return await apiRequest(`${API_ENDPOINTS.EDITABLE_PROFILE_DATA}/${pathSegment(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {'Content-Type': 'application/json',}
      });
    } finally {setLoading(false)}
  }, []);

  const getDashboard = useCallback(async (id: string, start: string | null, end: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append("start_date", start);
      if (end) params.append("end_date", end);
      return await apiRequest(`${API_ENDPOINTS.DASHBOARD_DATA}/${pathSegment(id)}${params.toString() && `?${params.toString()}`}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { getProfile, getTopDataProfile, getEditableProfile, patchProfile, getDashboard, loading };
};