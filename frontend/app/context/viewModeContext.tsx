"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLanguage } from './languageContext';

type ViewMode = 'grid_sm' | 'grid' | 'list';

interface ViewModeContextType {
  viewMode: ViewMode;
  toggleViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('globalViewMode') as ViewMode;
    if (saved) setViewMode(saved);
  }, []);

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('globalViewMode', mode);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, toggleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const { t } = useLanguage();
  const context = useContext(ViewModeContext);
  if (!context) throw new Error(`useViewMode ${t.context.template} ViewModeProvider`);
  return context;
}