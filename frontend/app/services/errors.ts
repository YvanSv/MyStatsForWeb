import { ApiError } from "./api";

/** Textes de la section `api` du dictionnaire utilisés pour décrire une erreur. */
export interface ApiErrorMessages {
  error1: string;
  errorConnecting: string;
  errorBadRequest: string;
  errorUnauthorized: string;
  errorForbidden: string;
  errorNotFound: string;
  errorConflict: string;
  errorValidation: string;
  errorRateLimit: string;
  errorServer: string;
}

const GENERIC_CODE = "API_ERROR";

const textOf = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value;
  const nested = (value as { detail?: unknown } | null | undefined)?.detail;
  return typeof nested === "string" && nested.trim() ? nested : null;
};

const messageForStatus = (status: number, a: ApiErrorMessages): string | null => {
  if (status >= 500) return a.errorServer;
  switch (status) {
    case 400: return a.errorBadRequest;
    case 401: return a.errorUnauthorized;
    case 403: return a.errorForbidden;
    case 404: return a.errorNotFound;
    case 409: return a.errorConflict;
    case 422: return a.errorValidation;
    case 429: return a.errorRateLimit;
    default: return null;
  }
};

/**
 * Message affichable pour une erreur : détail texte du backend si exploitable, sinon message traduit
 * selon le statut HTTP (ou réseau pour un échec de fetch), puis `fallback` (par défaut le message générique).
 * Ne renvoie jamais le code technique "API_ERROR".
 */
export const errorMessage = (err: unknown, t: { api: ApiErrorMessages }, fallback?: string): string => {
  const a = t.api;
  if (err instanceof TypeError) return a.errorConnecting;
  const status = (err as { status?: unknown } | null | undefined)?.status;
  if (err instanceof ApiError) {
    const detail = textOf(err.detail);
    if (detail) return detail;
  } else if (err instanceof Error && err.message && err.message !== GENERIC_CODE) {
    return err.message;
  }
  if (typeof status === "number") {
    const byStatus = messageForStatus(status, a);
    if (byStatus) return byStatus;
  }
  return fallback ?? a.error1;
};
