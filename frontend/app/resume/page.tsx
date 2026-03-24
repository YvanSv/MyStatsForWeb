"use client";
import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '../components/small_elements/CustomSpinner';
import ResumeCanvas from './ResumeCanvas';
import { WidgetsView } from './WidgetsView';
import { PropertiesView } from './PropertiesView';
import { DataFormat, PlacedWidget, RangeOption, SelectedWidget, SortOption } from './interfaces';
import { HeaderComponent } from './HeaderComponent';
import { useApiMyDatas } from '../hooks/useApiMyDatas';
import * as htmlToImage from 'html-to-image';

export default function ResumePage() {
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
      link.download = `mystats-${range}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erreur lors de l'export :", error);
    }
  };

  if (!resumeData) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:pt-6 md:p-4 animate-in fade-in duration-700">
      {/* HEADER ACTIONS */}
      <HeaderComponent range={range} setRange={setRange} offset={offset} setOffset={setOffset} sortBy={sortBy} setSortBy={setSortBy} displayLabel={displayLabel}/>

      {/* ZONE D'ÉDITION PRINCIPALE */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-5 items-start justify-center">
        {/* PANNEAU GAUCHE : ÉLÉMENTS À GLISSER */}
        <WidgetsView resumeData={resumeData}/>

        {/* CENTRE : LE CANVAS 3x5 */}
        <main className="flex-1 flex justify-center order-1 lg:order-2">
           <ResumeCanvas range={displayLabel} widgets={widgets} setWidgets={setWidgets} onSelectWidget={(w) => setSelectedWidget(w)}/>
        </main>

        {/* PANNEAU DROIT : OPTIONS */}
        <PropertiesView selectedWidget={selectedWidget} setSelectedWidget={setSelectedWidget} setWidgets={setWidgets} exportImage={exportImage}/>
      </div>
    </div>
  );
}