"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { languages } from '../constants/locales/lang';

type LanguageType = keyof typeof languages;
interface LanguageContextType {
  language: LanguageType;
  t: typeof languages['en'];
  changeLanguage: (newLanguage: LanguageType) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageType>("en");

  useEffect(() => {
    const saved = localStorage.getItem('language') as LanguageType;
    if (saved !== null) { setLanguage(saved); }
  }, []);

  const changeLanguage = (newLanguage:string) => {
    setLanguage(newLanguage as LanguageType);
    localStorage.setItem('language', newLanguage);
  };

  const t = languages[language];

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("languageContext doit être utilisé dans un LanguageProvider");
  return context;
}