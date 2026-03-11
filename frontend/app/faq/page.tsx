'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle, ShieldCheck, Zap } from 'lucide-react';
import { PrimaryButton } from '../components/Atomic/Buttons';

const faqData = [
  {
    question: "Comment sont calculés mes classements ?",
    answer: "Tes classements sont basés sur tes habitudes d'écoute réelles. Nous analysons le nombre de lectures, la durée d'écoute et la récurrence pour générer un score unique par titre, album et artiste.",
    icon: <Zap size={20} className="text-vert" />,
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument, la sécurité des données de nos utilisateurs reste notre priorité. Nous utilisons l'API officielle de Spotify pour l'authentification. Nous ne stockons jamais tes identifiants et tes données d'écoute ne sont jamais revendues à des tiers.",
    icon: <ShieldCheck size={20} className="text-blue-400" />,
  },
  {
    question: "À quelle fréquence les stats sont-elles mises à jour ?",
    answer: "Les données sont synchronisées en temps réel. Dès que tu termines une écoute sur Spotify, elle est prise en compte dans ton tableau de bord après un léger délai de traitement de quelques secondes.",
    icon: <HelpCircle size={20} className="text-purple-400" />,
  },
  {
    question: "Puis-je partager mes rankings avec mes amis ?",
    answer: "Oui ! Une fonctionnalité de partage (génération d'image et lien public) est disponible en haut à droite de chaque page de classement.",
    icon: <MessageCircle size={20} className="text-pink-400" />,
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-12">
      {/* Header de la page */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black uppercase tracking-[0.3em] text-white mb-4">
          FAQ
        </h1>
        <p className="text-gray-500 font-jost tracking-wide">
          Tout ce que vous devez savoir sur vos statistiques musicales.
        </p>
      </div>

      {/* Liste des Questions */}
      <div className="space-y-4">
        {faqData.map((item, index) => (
          <div 
            key={index}
            className="border border-white/5 bg-white/[0.02] rounded-xl overflow-hidden transition-all duration-300 hover:border-white/10"
          >
            <div
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-6 text-left group"
            >
              <div className="flex items-center gap-4">
                <span className="transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </span>
                <span className={`font-bold tracking-wide transition-colors duration-300 ${openIndex === index ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                  {item.question}
                </span>
              </div>
              <ChevronDown 
                className={`text-gray-600 transition-transform duration-500 ${openIndex === index ? 'rotate-180 text-white' : ''}`} 
                size={20} 
              />
            </div>

            <div 
              className={`transition-all duration-500 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <div className="p-6 pt-2 text-gray-500 leading-relaxed font-jost border-t border-white/5 bg-white/[0.01]">
                {item.answer}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Contact */}
      <div className="flex flex-col mt-16 p-8 rounded-2xl border border-dashed border-white/10 items-center">
        <p className="text-gray-500 mb-4">Vous ne trouvez pas votre réponse ?</p>
        <PrimaryButton additional='px-4 py-2'>
          Nous contacter
        </PrimaryButton>
      </div>
    </div>
  );
}