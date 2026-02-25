"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '@/app/hooks/useApi';
import { API_ENDPOINTS } from '../config';

interface AuthUser {
  id: number;
  email: string;
  display_name: string;
  spotify_id?: string;
}

interface AuthResponse {
  is_logged_in: boolean;
  user_name: string;
  id: number;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthResponse | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { request } = useApi();

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await request(`${API_ENDPOINTS.ME}`);
      // On s'assure que si l'API renvoie is_logged_in: false, on traite l'user comme null ou on stocke la réponse
      setUser(currentUser.is_logged_in ? currentUser : null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ 
      user,      // Type: AuthResponse | null
      loading,   // Type: boolean
      refreshUser // Type: function
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};