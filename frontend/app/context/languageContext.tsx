"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { languages } from '../constants/locales/lang';
import { readStorage, writeStorage } from './storage';

type LanguageType = keyof typeof languages;

// Object.hasOwn : « constructor » ou « __proto__ » ne sont pas des langues
const isLanguage = (value: unknown): value is LanguageType =>
  typeof value === 'string' && Object.hasOwn(languages, value);
interface LanguageContextType {
  language: LanguageType;
  t: typeof languages['fr'];
  changeLanguage: (newLanguage: LanguageType) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageType>("fr");

  useEffect(() => {
    const saved = readStorage('language');
    if (isLanguage(saved)) setLanguage(saved);
  }, []);

  // L'attribut lang de <html> (lecteurs d'écran, traduction automatique, coupure des mots) suit la langue choisie
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = (newLanguage:string) => {
    if (!isLanguage(newLanguage)) return;
    setLanguage(newLanguage);
    writeStorage('language', newLanguage);
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