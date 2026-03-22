"use client";

import { Globe, User, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/languageContext';

const BASE_UI = {
  glass: "bg-white/[0.02] border border-white/5 rounded-2xl",
  glassHover: "hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer",
};

export default function SettingsPage() {
  const { language, changeLanguage, t } = useLanguage();

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          {t.settings.title || "Paramètres"}
        </h1>
        <p className="text-gray-500 mt-2">{t.settings.subtitle || "Gérez vos préférences et votre compte"}</p>
      </header>

      <div className="grid gap-6">
        {/* Section Langue */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-gray-400">
            <Globe size={18} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">{t.settings.appearance || "Apparence & Langue"}</h2>
          </div>

          <div className={BASE_UI.glass + " p-6"}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text1 text-lg font-medium">{t.settings.titleLanguage}</h3>
                <p className="text-sm text-gray-500 italic min-w-xs">{t.settings.subtitleLanguage}</p>
              </div>

              <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code as "fr" | "en")}
                    className={`
                      flex items-center gap-2 px-6 py-2 rounded-lg transition-all duration-300
                      ${language === lang.code 
                        ? "bg-white/10 text-white shadow-lg ring-1 ring-white/20" 
                        : "text-gray-500 hover:text-gray-300"}
                    `}
                  >
                    <span>{lang.flag}</span>
                    <span className="font-medium">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Autres sections (Placeholders pour le style) */}
        <section className="space-y-4 opacity-50 grayscale pointer-events-none">
           <div className="flex items-center gap-2 px-1 text-gray-400">
            <User size={18} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Compte</h2>
          </div>
          <div className={BASE_UI.glass}>
             <div className={`p-4 flex items-center justify-between ${BASE_UI.glassHover}`}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-vert/20 flex items-center justify-center text-vert">YS</div>
                    <div>
                        <p className="font-medium text-white">Yvan Sv</p>
                        <p className="text-xs text-gray-500 underline">yvan@example.com</p>
                    </div>
                </div>
                <ChevronRight size={20} className="text-gray-600" />
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}