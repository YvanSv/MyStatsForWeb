"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ShowFiltersContextType {
  showFilters: boolean;
  toggleShowFilters: () => void;
}

const ShowFiltersContext = createContext<ShowFiltersContextType | undefined>(undefined);

export function ShowFiltersProvider({ children }: { children: React.ReactNode }) {
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('globalShowFilters');
    if (saved !== null) { setShowFilters(JSON.parse(saved)); }
    setIsInitialized(true);
  }, []);

  const toggleShowFilters = () => {
    setShowFilters(prev => {
      const next = !prev;
      localStorage.setItem('globalShowFilters', JSON.stringify(next));
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
  const context = useContext(ShowFiltersContext);
  if (!context) throw new Error("useShowFilters doit être utilisé dans un ShowFiltersProvider");
  return context;
}