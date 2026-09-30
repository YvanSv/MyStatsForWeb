import { useCallback } from "react";
import { useApi } from "./useApi";
import { API_ENDPOINTS } from "../constants/routes";
import { CleanAppleData } from "../data/DataInfos";

export const useApiUploadData = () => {
  const { request, loading } = useApi();
  const uploadSpotifyJson = useCallback(async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {formData.append("files", file)});
    return await request(API_ENDPOINTS.SPOTIFY_IMPORT, {
      method: "POST",
      body: formData,
    });
  }, [request]);

  const uploadAppleJson = useCallback(async (files: CleanAppleData[]) => {
    return await request(API_ENDPOINTS.APPLE_IMPORT, {
      method: "POST",
      body: JSON.stringify(files),
    });
  }, [request]);

  return { uploadSpotifyJson, uploadAppleJson, loading };
};