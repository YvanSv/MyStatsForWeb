'use client';

import { useState } from 'react';
import { ChevronDown, CloudDownload, Eraser, HelpCircle, MessageCircle, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { PrimaryButton } from '../components/Atomic/Buttons';

const faqData = [
  {
    question: "Comment sont calculés mes classements ?",
    answer: "Tes classements sont basés sur tes habitudes d'écoute réelles. Nous analysons le nombre de lectures, la durée d'écoute et la récurrence pour générer un score unique par titre, album et artiste.",
    icon: <Zap size={20} className="text-vert" />,
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    // answer: "Absolument, la sécurité des données de nos utilisateurs reste notre priorité. Nous utilisons l'API officielle de Spotify pour l'authentification. Nous ne stockons jamais tes identifiants et tes données d'écoute ne sont jamais revendues à des tiers.",
    answer: "Absolument. La sécurité de votre vie privée est notre priorité. Nous utilisons des protocoles de chiffrement pour protéger toutes les communications entre votre navigateur et nos serveurs. Vos mots de passe sont hachés via des algorithmes de pointe et ne sont jamais stockés en clair. Concernant vos fichiers Spotify, nous ne conservons que les informations nécessaires au calcul de vos statistiques (titres, artistes, dates d'écoute) et ne vendons jamais vos données à des tiers.",
    icon: <ShieldCheck size={20} className="text-blue-400" />,
  },
  {
    question: "À quelle fréquence les stats sont-elles mises à jour ?",
    answer: "Cela dépend de votre mode d'utilisation. Si vous utilisez l'importation de fichiers JSON, vos statistiques sont mises à jour instantanément après chaque import réussi. Si votre compte est synchronisé via l'API Spotify, MyStats actualise vos \"Écoutes récentes\" et vos tops à chaque fois qu'une page en a le besoin pour vous garantir une vue toujours fraîche de vos habitudes musicales.",
    icon: <HelpCircle size={20} className="text-purple-400"/>,
  },
  {
    question: "Puis-je partager mes rankings avec mes amis ?",
    answer: "Oui ! MyStats est conçu pour être social. Vous disposez d'un profil public unique (identifiable par votre url personnalisée) que vous pouvez copier et envoyer à vos proches. Vous pouvez également générer des cartes de partage optimisées pour vos réseaux sociaux (Instagram, Twitter, etc.) affichant vos artistes et titres favoris du moment. Cependant, uniquement les 50 meilleurs artistes/albums/tracks ne sont visibles par vos amis sur votre profil.",
    icon: <MessageCircle size={20} className="text-pink-400"/>,
  },
  {
    question: "Pourquoi mes statistiques d'albums et d'artistes ne s'affichent-elles pas immédiatement après un import ?",
    answer: "Lors d'un import massif de données d'historique, MyStats doit traiter des milliers de lignes pour identifier et regrouper chaque morceau par track, album et artiste. Ce processus peut prendre entre quelques secondes et quelques minutes selon la taille de vos fichiers. Il faut savoir que le temps varie aussi en fonction du nombre de personnes qui importent leurs données en même temps sur le site. Le processus d'import est très complexe, mais il est optimal pour vous offrir les meilleurs temps de réponses par la suite. Pour vous donner un ordre d'idée, nous récupérons les données de 50 artistes puis 50 albums en 5 secondes.",
    icon: <CloudDownload size={20} className="text-orange-400"/>,
  },
  {
    question: "Puis-je réinitialiser mes données sans supprimer mon compte ?",
    answer: "Oui. Si vous souhaitez repartir de zéro ou corriger un import erroné, vous pouvez choisir l'option \"Nettoyer mes données\" dans vos paramètres de compte. Cela effacera tout votre historique d'écoute importé tout en conservant vos paramètres de compte (nom d'utilisateur, email, mot de passe).",
    icon: <Eraser size={20} className="text-gray-400"/>,
  },
  {
    question: "Comment puis-je supprimer mon compte ?",
    answer: "Nous sommes tristes de vous voir partir, mais la procédure est simple. Rendez-vous dans les Paramètres du compte, tout en bas de la page. Vous y trouverez une option \"Supprimer mon compte MyStats\". Cette action est définitive : elle supprimera immédiatement votre profil, vos identifiants ainsi que l'intégralité de votre historique d'écoute de nos serveurs.",
    icon: <Trash2 size={20} className="text-red-400"/>,
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-12">
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