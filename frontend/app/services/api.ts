export class ApiError extends Error {
  status: number;
  detail: any;

  constructor(status: number, detail: any) {
    // On extrait un message humainement lisible
    const message = ApiError.extractMessage(detail);
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }

  private static extractMessage(detail: any): string {
    if (typeof detail === 'string') return detail;
    
    // Si c'est le format FastAPI { detail: "message" }
    if (detail?.detail && typeof detail.detail === 'string') return detail.detail;
    
    // Si c'est une erreur de validation Pydantic (Array d'objets)
    if (Array.isArray(detail?.detail)) {
      const firstErr = detail.detail[0];
      return `Erreur sur ${firstErr.loc.join('.')}: ${firstErr.msg}`;
    }

    return detail?.message || 'Une erreur inattendue est survenue';
  }
}

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);

  // 1. Gestion intelligente du Body
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

  try {
    const response = await fetch(endpoint, { 
      ...options, 
      body: finalBody, // On utilise le body traité
      credentials: 'include',
      headers: headers 
    });

    if (!response.ok) {
      let errorDetail;
      try {errorDetail = await response.json()}
      catch {errorDetail = response.statusText}

      // GESTION GLOBALE DES STATUS
      if (response.status === 401) {
        // Optionnel : Rediriger ou vider le store utilisateur
        console.warn("Session expirée, redirection...");
        // window.location.href = '/login?error=expired'; 
      }

      throw new ApiError(response.status, errorDetail);
    }

    return response.status === 204 ? null : await response.json();
  } catch (error: any) {
    if (!(error instanceof ApiError)) throw new Error("Connexion au serveur impossible.");
    throw error;
  }
};