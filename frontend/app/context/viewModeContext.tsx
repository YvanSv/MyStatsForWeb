"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLanguage } from './languageContext';
import { readStorage, writeStorage } from './storage';

const VIEW_MODES = ['grid_sm', 'grid', 'list'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const isViewMode = (value: unknown): value is ViewMode => VIEW_MODES.includes(value as ViewMode);

interface ViewModeContextType {
  viewMode: ViewMode;
  toggleViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const saved = readStorage('globalViewMode');
    if (isViewMode(saved)) setViewMode(saved);
  }, []);

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    writeStorage('globalViewMode', mode);
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