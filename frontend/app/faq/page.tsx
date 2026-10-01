'use client';

import { useState } from 'react';
import { ChevronDown, CloudDownload, Eraser, HelpCircle, MessageCircle, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { PrimaryButton } from '../components/Atomic/Buttons';
import { useLanguage } from '../context/languageContext';

const faqIcons = [
  <Zap key="zap" size={20} className="text-vert" />,
  <ShieldCheck key="ShieldCheck" size={20} className="text-blue-400" />,
  <HelpCircle key="HelpCircle" size={20} className="text-purple-400"/>,
  <MessageCircle key="MessageCircle" size={20} className="text-pink-400"/>,
  <CloudDownload key="CloudDownload" size={20} className="text-orange-400"/>,
  <Eraser key="Eraser" size={20} className="text-gray-400"/>,
  <Trash2 key="Trash2" size={20} className="text-red-400"/>,
];

export default function FAQPage() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-12">
      {/* Header de la page */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black uppercase tracking-[0.3em] text-white mb-4">
          {t.faq.title}
        </h1>
        <p className="text-gray-500 font-jost tracking-wide">
          {t.faq.subtitle}
        </p>
      </div>

      {/* Liste des Questions */}
      <div className="space-y-4">
        {faqIcons.map((icon, index) => {
          const question = t.faq[`q${index + 1}` as keyof typeof t.faq];
          const answer = t.faq[`a${index + 1}` as keyof typeof t.faq];
          return (
          <div 
            key={index}
            className="border border-white/5 bg-white/[0.02] rounded-xl overflow-hidden transition-all duration-300 hover:border-white/10"
          >
            <button
              type="button"
              id={`faq-question-${index}`}
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-6 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="transition-transform duration-300 group-hover:scale-110">
                  {icon}
                </span>
                <span className={`font-bold tracking-wide transition-colors duration-300 ${openIndex === index ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                  {question}
                </span>
              </div>
              <ChevronDown 
                className={`text-gray-600 transition-transform duration-500 ${openIndex === index ? 'rotate-180 text-white' : ''}`} 
                size={20} 
                aria-hidden="true"
              />
            </button>

            <div
              id={`faq-answer-${index}`}
              role="region"
              aria-labelledby={`faq-question-${index}`}
              aria-hidden={openIndex !== index}
              inert={openIndex !== index}
              // Hauteur animée par grid-template-rows (0fr -> 1fr) : elle s'adapte au texte, aucune réponse n'est coupée
              className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out motion-reduce:transition-none ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <div className="p-6 pt-2 text-gray-500 leading-relaxed font-jost border-t border-white/5 bg-white/[0.01]">
                  {answer}
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Footer Contact */}
      <div className="flex flex-col mt-16 p-8 rounded-2xl border border-dashed border-white/10 items-center">
        <p className="text-gray-500 mb-4">{t.faq.notFound}</p>
        <PrimaryButton additional='px-4 py-2'>
          {t.faq.contact}
        </PrimaryButton>
      </div>
    </div>
  );
}