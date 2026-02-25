"use client";

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '@/app/hooks/useApi';
import { API_ENDPOINTS } from '@/app/config';
import { useRouter } from 'next/navigation';

// Structure exacte de ce que renvoie /me
interface AuthResponse {
  id: number;
  user_name: string;
  has_spotify: boolean;
  is_logged_in: boolean;
}

interface AuthContextType {
  user: AuthResponse | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
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

  // Fonction de déconnexion
  const logout = async () => {
    try {await request(API_ENDPOINTS.LOGOUT)}
    catch (error) {console.error("Logout error:", error)}
    finally {
      setUser(null);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      loading, 
      refreshUser, 
      logout,
      isLoggedIn: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}