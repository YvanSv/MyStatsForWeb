"use client";

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '@/app/hooks/useApi';
import { API_ENDPOINTS } from '@/app/constants/routes';
import { useRouter } from 'next/navigation';

// Structure exacte de ce que renvoie /me
interface AuthResponse {
  id: number;
  user_name: string;
  has_spotify: boolean;
  is_logged_in: boolean;
  email: string;
}

interface AuthContextType {
  user: AuthResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (newUsername: string) => Promise<void>;
  loginSpotify: () => void;
  unlinkSpotify: () => Promise<void>;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { request } = useApi();
  const router = useRouter();

  // Fonction pour récupérer les infos de l'utilisateur
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request(API_ENDPOINTS.ME);
      setUser(data);
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
    try {await request(API_ENDPOINTS.LOGOUT)}
    catch (error) {console.error("Logout error:", error)}
    finally {
      setUser(null);
      router.push('/');
    }
  };

  const updateUserProfile = async (newUsername: string) => {
    try {
      await request(API_ENDPOINTS.EDIT_INFOS, {
        method: 'PATCH',
        body: JSON.stringify({ username: newUsername })
      });
      setUser(prev => prev ? { ...prev, user_name: newUsername } : null);
      await refreshUser(); 
    } catch (err) {throw err}
  };

  const loginSpotify = () => {window.location.href = API_ENDPOINTS.SPOTIFY_LOGIN};

  const unlinkSpotify = async () => {
    try {setUser(prev => prev ? { ...prev, has_spotify: false } : null)}
    catch (err) {
      console.error("Erreur lors du déliage :", err);
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
      unlinkSpotify,
      isLoggedIn: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}