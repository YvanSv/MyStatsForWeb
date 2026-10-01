/**
 * Extrait un message lisible du détail d'une erreur :
 * - une chaîne (ex : message fourni directement) est utilisée telle quelle ;
 * - `{ detail: "..." }` est le format des HTTPException FastAPI ;
 * - sinon (ex : erreurs de validation 422, sous forme de liste) on garde un code générique.
 */
const extractMessage = (detail: unknown): string => {
  if (typeof detail === "string" && detail) return detail;
  const nested = (detail as { detail?: unknown } | null | undefined)?.detail;
  if (typeof nested === "string" && nested) return nested;
  return "API_ERROR";
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(extractMessage(detail));
    this.status = status;
    this.detail = detail;
  }
}

const isPlainBody = (body: unknown): body is object => {
  if (!body || typeof body !== 'object') return false;
  if (Array.isArray(body)) return true;
  const proto = Object.getPrototypeOf(body);
  return proto === Object.prototype || proto === null;
};

type UnauthorizedHandler = (endpoint: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Enregistre la fonction appelée une seule fois par réponse 401 (session expirée ou absente), avant que l'erreur
 * ne soit levée à l'appelant. Renvoie une fonction qui retire ce gestionnaire.
 */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
  return () => { if (unauthorizedHandler === handler) unauthorizedHandler = null };
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  let finalBody = options.body;
  
  // Seuls les objets simples et les tableaux sont sérialisés (FormData, URLSearchParams, Blob, ArrayBuffer… partent tels quels)
  if (isPlainBody(options.body)) {
    finalBody = JSON.stringify(options.body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  } 
  // Si c'est déjà une string, on s'assure juste du Content-Type
  else if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(endpoint, { 
    ...options, 
    body: finalBody,
    credentials: 'include',
    headers: headers 
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Un gestionnaire défaillant ne doit jamais masquer l'erreur d'origine
      try { unauthorizedHandler?.(endpoint) } catch { /* ignoré */ }
    }
    const errorDetail = await response.json().catch(() => response.statusText);
    throw new ApiError(response.status, errorDetail);
  }
  // Réponse sans contenu : il n'y a pas de JSON à lire
  if (response.status === 204) return null;
  return response.json();
};