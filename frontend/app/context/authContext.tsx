"use client";
import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import { setUnauthorizedHandler } from '@/app/services/api';
import { useApi } from '@/app/hooks/useApi';
import { API_ENDPOINTS, FRONT_ROUTES } from '@/app/constants/routes';
import { useRouter } from 'next/navigation';
import { useLanguage } from './languageContext';

// Structure exacte de ce que renvoie /me
interface ProviderInfo {
  has: boolean;
  email: string | null;
}

interface AuthResponse {
  id: number;
  user_name: string;
  slug: string;
  email: string;
  avatar: string;
  is_logged_in: boolean;
  isAdmin: boolean;
  // Clés = valeurs de MusicProvider côté backend
  providers: {
    SPOTIFY: ProviderInfo;
    APPLE_MUSIC: ProviderInfo;
    MUSICBRAINZ: ProviderInfo;
  };
}

interface AuthContextType {
  user: AuthResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: {}) => Promise<void>;
  loginSpotify: () => void;
  deleteAccount: () => Promise<void>;
  clearAccount: () => Promise<void>;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { request } = useApi();
  const router = useRouter();
  const { t } = useLanguage();
  const userRef = useRef<AuthResponse | null>(null);
  useEffect(() => { userRef.current = user }, [user]);

  // Gestion globale du 401 : si une requête d'un utilisateur connecté est refusée, la session a expiré.
  // On le déconnecte ici ; les pages protégées (ProtectedRoute) le renvoient alors vers /auth.
  useEffect(() => setUnauthorizedHandler((endpoint) => {
    // Ces appels renvoient 401 en fonctionnement normal (mauvais identifiants, pas encore de session)
    const expected = [API_ENDPOINTS.LOGIN, API_ENDPOINTS.REGISTER, API_ENDPOINTS.ME, API_ENDPOINTS.LOGOUT];
    if (expected.some(e => endpoint.startsWith(e))) return;
    if (!userRef.current) return;
    userRef.current = null;
    setUser(null);
    toast.error(t.api.redirect);
  }), [t]);

  // Fonction pour récupérer les infos de l'utilisateur
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      setUser(await request(API_ENDPOINTS.ME));
    } catch (err) {setUser(null)}
    finally {setLoading(false)}
  }, [request]);

  // Vérification au chargement initial de l'application
  useEffect(() => {refreshUser()}, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await request(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.user) setUser(response.user)
      else await refreshUser()
    } catch (err) {throw err}
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      await request(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      // Auto-login après inscription
      await login(email, password);
    } catch (err) {throw err}
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {await request(API_ENDPOINTS.LOGOUT, {method: 'POST'})}
    catch (error) {console.error("Logout error:", error)}
    finally {setUser(null); router.push(FRONT_ROUTES.ACCUEIL);}
  };

  const updateUserProfile = async (data: {}) => {
    try {
      await request(API_ENDPOINTS.EDIT_INFOS, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      await refreshUser(); 
    } catch (err) {throw err}
  };

  const loginSpotify = () => {window.location.href = API_ENDPOINTS.SPOTIFY_LOGIN};

  const deleteAccount = async () => {
    try {
      await request(API_ENDPOINTS.DELETE_ACCOUNT, {method: 'DELETE'});
      setUser(null);
      router.push(FRONT_ROUTES.ACCUEIL);
    } catch (err: any) {
      // Si l'erreur est une 401, le compte est probablement déjà supprimé ou la session expirée
      if (err.status === 401) {
        setUser(null);
        router.push(FRONT_ROUTES.ACCUEIL);
      }
      console.error("Erreur suppression compte:", err);
      throw err;
    }
  };

  const clearAccount = async () => {
    try {
      await request(API_ENDPOINTS.CLEAR_ACCOUNT, {method: 'DELETE'});
      await refreshUser();
    }
    catch (err: any) {
      console.error("Erreur nettoyage compte:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      loading,
      refreshUser,
      login,
      register,
      logout,
      updateUserProfile,
      loginSpotify,
      deleteAccount,
      clearAccount,
      isLoggedIn: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const { t } = useLanguage();
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error(`useAuth ${t.context.template} AuthProvider`);
  return context;
};