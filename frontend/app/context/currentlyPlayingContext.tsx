"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../constants/routes';
import toast from 'react-hot-toast';
import { useLanguage } from './languageContext';
import { useAuth } from './authContext';

export interface SpotifyListeningData {
    title: string;
    progress_ms: number;
    duration_ms: number;
    album_name: string;
    artist_name: string;
    cover_url: string;
}

interface SpotifyContextType {
    listening: { is_listening: boolean; data: SpotifyListeningData | null };
    localProgress: number;
    isPaused: boolean;
    fetchCurrent: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    next: () => Promise<void>;
    previous: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { request } = useApi();
    const [paused, setPaused] = useState(true);
    const [listening, setListening] = useState<{ is_listening: boolean; data: SpotifyListeningData | null }>({
        is_listening: false,
        data: null
    });
    const [localProgress, setLocalProgress] = useState(0);
    
    // On utilise une Ref pour éviter les problèmes de closure dans le setInterval
    const lastSyncRef = useRef<number>(0);

    const fetchCurrent = useCallback(async () => {
        if (!user || !user.is_logged_in) return;
        try {
            const res = await request(API_ENDPOINTS.CURRENTLY_PLAYING);
            // SI ON REÇOIT DE LA DATA (Lecture ou Pause)
            if (res && res.data) {
                setListening(res);
                setPaused(res.is_listening);
                setLocalProgress(res.data.progress_ms);
            } 
            // SI SPOTIFY RENVOIE VIDE (Session terminée)
            else if (!res || res.is_listening === false) {
                setListening(prev => ({ ...prev, is_listening: false }));
                setPaused(true);
            }
            // On NE met PAS data à null ici pour garder l'affichage de la dernière track
        } catch (e) {console.error(e)}
    }, [request]);

    // Polling API toutes les 15 secondes
    useEffect(() => {
        fetchCurrent();
        const apiInterval = setInterval(fetchCurrent, 15000);
        return () => clearInterval(apiInterval);
    }, [fetchCurrent]);

    // Progression fluide (Toutes les secondes)
    useEffect(() => {
        if (!listening.is_listening || !listening.data) return;

        const timer = setInterval(() => {
            setLocalProgress(prev => {
                const next = prev + 1000;
                // Si on dépasse la durée, on force un refresh API
                if (!paused && next >= (listening.data?.duration_ms || 0)) {
                    fetchCurrent();
                    return prev;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [listening.is_listening, listening.data, fetchCurrent]);

    // Fonction utilitaire pour rafraîchir après une action
    const refreshAfterAction = useCallback(() => {
        setTimeout(fetchCurrent, 500);
    }, [fetchCurrent]);

    const handleSpotifyError = (error: any) => {
        const status = error.status || error.response?.status;
        if (status === 403) toast.error("Spotify Premium est requis", {duration: 5000});
        else if (status === 404) toast.error("Aucun appareil actif");
        else toast.error("Erreur Spotify");
    };

    const pause = useCallback(async () => {
        try {
            await request(API_ENDPOINTS.PAUSE, { method: 'PUT' });
            setListening(prev => ({ ...prev, is_listening: false }));
            setPaused(true);
            refreshAfterAction();
        } catch(e) {handleSpotifyError(e)}
    }, [request, refreshAfterAction]);

    const resume = useCallback(async () => {
        try {
            await request(API_ENDPOINTS.RESUME, { method: 'PUT' });
            setListening(prev => ({ ...prev, is_listening: true }));
            setPaused(false);
            refreshAfterAction();
        } catch(e) {handleSpotifyError(e)}
    }, [request, refreshAfterAction]);

    const next = useCallback(async () => {
        try {
            await request(API_ENDPOINTS.NEXT, { method: 'POST' });
            refreshAfterAction();
        } catch(e) {handleSpotifyError(e)}
    }, [request, refreshAfterAction]);

    const previous = useCallback(async () => {
        try {
            await request(API_ENDPOINTS.PREVIOUS, { method: 'POST' });
            refreshAfterAction();
        } catch(e) {handleSpotifyError(e)}
    }, [request, refreshAfterAction]);

    return (
        <SpotifyContext.Provider value={{
            listening,
            localProgress,
            isPaused:paused,
            fetchCurrent,
            pause,
            resume,
            next,
            previous
        }}>
            {children}
        </SpotifyContext.Provider>
    );
};

export const useSpotify = () => {
  const { t } = useLanguage();
    const context = useContext(SpotifyContext);
    if (!context) throw new Error(`useSpotify ${t.context.template} SpotifyProvider`);
    return context;
};