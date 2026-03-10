import { useCallback } from "react";
import { useApi } from "./useApi";
import { API_ENDPOINTS } from "../constants/routes";

export const useApiSpotifyData = () => {
  const { request, loading } = useApi();
  const uploadSpotifyJson = useCallback(async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {formData.append("files", file)});
    return await request(API_ENDPOINTS.UPLOAD_JSON, {
      method: "POST",
      body: formData,
    });
  }, [request]);

  return { uploadSpotifyJson, loading };
};