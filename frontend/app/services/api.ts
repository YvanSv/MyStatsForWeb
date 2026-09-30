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

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  let finalBody = options.body;
  
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
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
    const errorDetail = await response.json().catch(() => response.statusText);
    throw new ApiError(response.status, errorDetail);
  }
  return response.json();
};