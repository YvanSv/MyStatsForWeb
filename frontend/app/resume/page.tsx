"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingSpinner } from '../components/small_elements/CustomSpinner';
import { WidgetsView } from './WidgetsView';
import { PropertiesView } from './PropertiesView';
import { DataFormat, PlacedWidget, RangeOption, SelectedWidget, SortOption } from './interfaces';
import { useApiMyDatas } from '../hooks/useApiMyDatas';
import * as htmlToImage from 'html-to-image';
import { useLanguage } from '../context/languageContext';
import { Download, ListFilter, Minus, Plus, Share2 } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../components/Atomic/Buttons';
import ResumeCanvas from './ResumeCanvas';

export default function ResumePage() {
  const { t } = useLanguage();
  const { getResumeStats } = useApiMyDatas();
  const [resumeData, setResumeData] = useState<DataFormat | null>(null);
  const [widgets, setWidgets] = useState<PlacedWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<SelectedWidget | null>(null);
  // États pour les sélecteurs
  const [range, setRange] = useState<RangeOption>("year");
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("streams");

  // Calcul du libellé affiché (ex: "2025" ou "Mars 2026")
  const displayLabel = useMemo(() => {
    const now = new Date();
    if (range === 'lifetime') return "All Time";
    if (range === 'year') return now.getFullYear() - offset;
    if (range === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    if (range === 'day') {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (range === 'season') {
      const seasons = ["Hiver", "Printemps", "Été", "Automne"];
      
      // Mois actuel (0-11) - offset*3 (car une saison = 3 mois)
      const targetDate = new Date(now.getFullYear(), now.getMonth() - (offset * 3), 1);
      const targetSeasonIdx = Math.floor(targetDate.getMonth() / 3);
      const targetYear = targetDate.getFullYear();
      
      return `${seasons[targetSeasonIdx]} ${targetYear}`;
    }
    
    return range;
  }, [range, offset]);

  useEffect(() => {
    const fetchResume = async () => {
      // setLoading(true);
      try {
        // On passe les paramètres à ton hook API
        const data = await getResumeStats({"range":range,"sort":sortBy,"offset":offset});
        setResumeData(data);
      } catch (error) {
        console.error("Erreur lors de la récupération du résumé:", error);
      } finally {
        // setLoading(false);
      }
    };

    fetchResume();
  }, [range, offset, sortBy]); // Se déclenche dès qu'un filtre change

  const exportImage = async () => {
    const node = document.getElementById('capture-canvas');
    if (!node) return;

    try {
      // 1. On génère l'URL de l'image (PNG)
      // On peut ajouter des options pour améliorer la qualité
      const dataUrl = await htmlToImage.toPng(node, {
        quality: 1,
        pixelRatio: 2, // Double la résolution pour un rendu net (Retina)
        backgroundColor: '#000000', // Force le fond noir
      });

      // 2. Création d'un lien invisible pour déclencher le téléchargement
      const link = document.createElement('a');
      link.download = `mystats-${range}-${resumeData?.user.display_name}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erreur lors de l'export :", error);
    }
  };

  const handleRangeChange = (newRange: RangeOption) => {
    setRange(newRange);
    setOffset(0);
  };

  if (!resumeData) return <LoadingSpinner />;

  return (
    <div className='flex justify-between text1'>
      {/* PANNEAU GAUCHE : ÉLÉMENTS À GLISSER */}
      <div className='min-w-[24%] max-w-[24%] flex flex-col h-[calc(100vh-142px)] border-r border-white/10'>
        <h1 className="pt-4 px-4 pb-3 text-4xl font-black tracking-tighter uppercase italic">{t.resume.title || "Your Universe"}</h1>

        <WidgetsView resumeData={resumeData}/>

        <p className="p-4 bg-vert/10 border-t border-vert/20 text-[10px] text-vert font-bold uppercase leading-tight shrink-0">
          Glissez un widget sur la grille pour l'ajouter au visuel.
        </p>
      </div>

      {/* CENTRE : LE CANVAS 3x5 */}
      <div className='flex-col min-w-[52%] max-w-[52%] items-center'>
        {/* BARRE DE FILTRES */}
        <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-white/5">
          {/* Sélecteur de Tri */}
          <div className="flex items-center gap-3 pr-2 bg-black/40 rounded-xl p-0.5 border border-white/5">
            <div className="px-2 text-gray-500"><ListFilter size={16}/></div>
            {[
              { id: 'streams', label: 'Streams' },
              { id: 'minutes', label: 'Temps' },
              { id: 'rating', label: 'Rating' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id as SortOption)}
                className={`px-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all  ${
                  sortBy === opt.id ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
                }`}
              >{opt.label}</button>
            ))}
          </div>

          <div className="hidden md:block w-px h-6 bg-white/10" />

          <div className='flex gap-2 w-full'>
            {/* Sélecteur de Type (Range) */}
            <div className="flex items-center gap-3 px-2 bg-black/40 rounded-xl p-0.5 border border-white/5">
              {(['day', 'month', 'season', 'year', 'lifetime'] as RangeOption[]).map((opt) => (
                <button key={opt} onClick={() => handleRangeChange(opt)}
                  className={`px-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    range === opt ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
                  }`}
                >{opt}</button>
              ))}
            </div>

            {/* Contrôleur de Navigation Temporelle */}
            <div className="min-w-[40%] justify-between flex items-center gap-1 bg-black/40 rounded-xl border border-white/5">
              <button onClick={() => setOffset(prev => prev + 1)} disabled={range === 'lifetime'}
                className="px-2 py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
              ><Minus size={16} strokeWidth={3}/></button>

              <p className="text-sm font-black uppercase italic tracking-tighter leading-none">
                {displayLabel}
              </p>

              <button onClick={() => setOffset(prev => Math.max(0, prev - 1))} disabled={range === 'lifetime' || offset === 0}
                className="px-2 py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
              ><Plus size={16} strokeWidth={3} /></button>
            </div>
          </div>
        </div>

        <div className='flex w-full h-full justify-center items-center max-h-[93%] overflow-y-auto custom-scrollbar'>
          <ResumeCanvas range={displayLabel} widgets={widgets} setWidgets={setWidgets} onSelectWidget={setSelectedWidget}/>
        </div>
      </div>

      {/* PANNEAU DROIT : OPTIONS */}
      <div className='min-w-[24%] max-w-[24%]'>
        <div className="flex px-6 pt-4 pb-3 border-l border-white/10 justify-between">
          <SecondaryButton onClick={exportImage} additional='px-5 py-2 gap-2'>
            <Download size={20}/> {t.resume.download || "Télécharger"}
          </SecondaryButton>
          <PrimaryButton additional='px-8 py-2 gap-2 font-bold'>
            <Share2 size={18}/> {t.resume.share || "Partager"}
          </PrimaryButton>
        </div>
        
        <PropertiesView selectedWidget={selectedWidget} setSelectedWidget={setSelectedWidget} setWidgets={setWidgets} exportImage={exportImage}/>

        <p className="p-4 bg-vert/10 border border-vert/20 text-[10px] text-vert font-bold uppercase leading-tight">
          Sélectionnez un élément sur la grille pour le modifier.
        </p>
      </div>
    </div>
    // <div className="min-h-screen bg-black text-white p-4 md:pt-6 md:p-4 animate-in fade-in duration-700">
    //   {/* HEADER ACTIONS */}
    //   <HeaderComponent range={range} setRange={setRange} offset={offset} setOffset={setOffset} sortBy={sortBy} setSortBy={setSortBy} displayLabel={displayLabel}/>
    // </div>
  );
}