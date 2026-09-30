"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLanguage } from './languageContext';
import { readStorage, writeStorage } from './storage';

interface ShowFiltersContextType {
  showFilters: boolean;
  toggleShowFilters: () => void;
}

const ShowFiltersContext = createContext<ShowFiltersContextType | undefined>(undefined);

export function ShowFiltersProvider({ children }: { children: React.ReactNode }) {
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    const saved = readStorage('globalShowFilters');
    // Seules les valeurs « true » et « false » sont acceptées (JSON invalide ou autre type ignoré)
    if (saved === 'true') setShowFilters(true);
    else if (saved === 'false') setShowFilters(false);
  }, []);

  const toggleShowFilters = () => {
    setShowFilters(prev => {
      const next = !prev;
      writeStorage('globalShowFilters', JSON.stringify(next));
      return next;
    });
  };

  return (
    <ShowFiltersContext.Provider value={{ showFilters, toggleShowFilters }}>
      {children}
    </ShowFiltersContext.Provider>
  );
}

export function useShowFilters() {
  const { t } = useLanguage();
  const context = useContext(ShowFiltersContext);
  if (!context) throw new Error(`useShowFilters ${t.context.template} ShowFiltersProvider`);
  return context;
}