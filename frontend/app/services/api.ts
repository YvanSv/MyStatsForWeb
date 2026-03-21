import { useLanguage } from "../context/languageContext";

export class ApiError extends Error {
  status: number;
  detail: any;

  constructor(status: number, detail: any) {
    super("API_ERROR");
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