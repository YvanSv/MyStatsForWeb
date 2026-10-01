"use client";
import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '../components/small_elements/CustomSpinner';
import { WidgetsView } from './WidgetsView';
import { PropertiesView } from './PropertiesView';
import { DataFormat, PlacedWidget, RangeOption, SelectedWidget, SortOption } from './interfaces';
import { useApiMyDatas } from '../hooks/useApiMyDatas';
import * as htmlToImage from 'html-to-image';
import { useLanguage } from '../context/languageContext';
import { Download, Share2 } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../components/Atomic/Buttons';
import ResumeCanvas from './ResumeCanvas';
import { HeaderComponent } from './HeaderComponent';
import toast from 'react-hot-toast';
import { seasonOfMonth, seasonStart } from '../services/seasons';
import { exportFileName, loadLayout, saveLayout } from './gridLayout';

const SEASON_NAMES = ["Hiver", "Printemps", "Été", "Automne"];

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
  // Échec du chargement : sans ça, le spinner tournait indéfiniment quand l'API échouait
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Vrai pendant chaque chargement : les anciennes données restent affichées mais marquées « occupé »
  const [loading, setLoading] = useState(true);
  // Évite d'écrire l'état vide initial avant d'avoir restauré la mise en page enregistrée
  const [layoutRestored, setLayoutRestored] = useState(false);

  // Restauration côté client uniquement (après l'hydratation)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage n'existe pas au rendu serveur : lecture obligatoirement après l'hydratation
    setWidgets(loadLayout());
    setLayoutRestored(true);
  }, []);

  useEffect(() => {
    if (layoutRestored) saveLayout(widgets);
  }, [widgets, layoutRestored]);

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
      // Saisons météo partagées avec le dashboard et le backend ; l'année est celle du début de saison
      const start = seasonStart(now, -offset);
      return `${SEASON_NAMES[seasonOfMonth(start.getMonth())]} ${start.getFullYear()}`;
    }
    
    return range;
  }, [range, offset]);

  useEffect(() => {
    // Une réponse arrivée après un changement de filtre (ou un démontage) ne doit pas écraser la plus récente
    let cancelled = false;
    setLoadFailed(false);
    setLoading(true);

    const fetchResume = async () => {
      try {
        const data = await getResumeStats({"range":range,"sort":sortBy,"offset":offset});
        if (cancelled) return;
        setResumeData(data);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error("Erreur lors de la récupération du résumé:", error);
        setLoadFailed(true);
        setLoading(false);
      }
    };

    fetchResume();
    return () => { cancelled = true };
  }, [range, offset, sortBy, reloadKey]); // Se déclenche dès qu'un filtre change ou qu'on relance le chargement

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
        // Ni anneau de sélection, ni grille vide, ni poignées/boutons de suppression dans l'image
        filter: (n: Node) => !(n instanceof HTMLElement && n.dataset.exportIgnore === "true"),
      });

      // 2. Création d'un lien invisible pour déclencher le téléchargement
      const link = document.createElement('a');
      link.download = exportFileName(range, resumeData?.user?.display_name, Date.now());
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erreur lors de l'export :", error);
      toast.error(t.resume.exportError);
    }
  };

  if (!resumeData) {
    if (!loadFailed) return <LoadingSpinner />;
    return (
      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-bold">{t.resume.loadError}</p>
        <PrimaryButton onClick={() => setReloadKey(k => k + 1)} additional="px-6 py-2">
          {t.resume.retry}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 h-full min-h-0" aria-busy={loading}>
      {loading && (
        <div data-testid="resume-reloading" className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-full bg-black/70 p-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <div className={`flex flex-1 h-full min-h-0 w-full transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex flex-col flex-5 border-r border-white/10 min-h-0">
        {/* HEADER FIXE */}
        <p className="pt-4 px-4 pb-3 text-4xl font-black tracking-tighter uppercase italic shrink-0">
          {t.resume.title || "Your Universe"}
        </p>

        {/* ZONE SCROLLABLE */}
        <WidgetsView resumeData={resumeData}/>

        {/* FOOTER */}
        <div className="p-4 bg-vert/10 border-t border-vert/20 text-[10px] text-vert font-bold uppercase leading-tight shrink-0">
          Glissez un widget sur la grille.
        </div>
      </div>

      <div className='flex flex-col flex-13 items-center'>
        {/* BARRE DE FILTRES */}
        <HeaderComponent range={range} setRange={setRange} offset={offset}
          setOffset={setOffset} displayLabel={displayLabel}
        />

        <ResumeCanvas range={displayLabel} widgets={widgets} setWidgets={setWidgets} onSelectWidget={setSelectedWidget} resumeData={resumeData}/>
      </div>

      <div className="flex flex-col flex-5 border-r border-white/10 min-h-0">
        {/* HEADER FIXE */}
        <div className="flex px-3 pt-4 pb-3 border-l border-white/10 justify-between">
          <SecondaryButton onClick={exportImage} additional='px-4 py-2 gap-2'>
            <Download size={20}/> {t.resume.download || "Télécharger"}
          </SecondaryButton>
          <PrimaryButton additional='px-5 py-2 gap-2 font-bold'>
            <Share2 size={18}/> {t.resume.share || "Partager"}
          </PrimaryButton>
        </div>

        {/* ZONE SCROLLABLE */}
        <PropertiesView selectedWidget={selectedWidget} setSelectedWidget={setSelectedWidget} setWidgets={setWidgets} exportImage={exportImage}/>

        {/* FOOTER */}
        <p className="p-4 bg-vert/10 border border-vert/20 text-[10px] text-vert font-bold uppercase leading-tight">
          Sélectionnez un élément sur la grille pour l'éditer.
        </p>
      </div>
      </div>
    </div>
    // <div className='flex'>
    //   {/* PANNEAU GAUCHE : ÉLÉMENTS À GLISSER */}
    //   <div className='flex flex-col w-[24%] border-r border-white/10'>
    //     <h1 className="pt-4 px-4 pb-3 text-4xl font-black tracking-tighter uppercase italic">{t.resume.title || "Your Universe"}</h1>

    //     <div className='flex-1 flex flex-col h-0'>
    //       <WidgetsView resumeData={resumeData}/>
    //     </div>

    //     <p className="p-4 bg-vert/10 border-t border-vert/20 text-[10px] text-vert font-bold uppercase leading-tight">
    //       Glissez un widget sur la grille pour l'ajouter au visuel.
    //     </p>
    //   </div>
    // </div>
      

    //   {/* CENTRE : LE CANVAS 3x5 */}
    //   <div className='flex flex-col flex-1 min-w-[52%] max-w-[52%]'>
        // {/* BARRE DE FILTRES */}
        // <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-white/5">
        //   {/* Sélecteur de Tri */}
        //   <div className="flex items-center gap-3 pr-2 bg-black/40 rounded-xl p-0.5 border border-white/5">
        //     <div className="px-2 text-gray-500"><ListFilter size={16}/></div>
        //     {[
        //       { id: 'streams', label: 'Streams' },
        //       { id: 'minutes', label: 'Temps' },
        //       { id: 'rating', label: 'Rating' }
        //     ].map((opt) => (
        //       <button
        //         key={opt.id}
        //         onClick={() => setSortBy(opt.id as SortOption)}
        //         className={`px-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all  ${
        //           sortBy === opt.id ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
        //         }`}
        //       >{opt.label}</button>
        //     ))}
        //   </div>

        //   <div className="hidden md:block w-px h-6 bg-white/10" />

        //   <div className='flex gap-2 w-full'>
        //     {/* Sélecteur de Type (Range) */}
        //     <div className="flex items-center gap-3 px-2 bg-black/40 rounded-xl p-0.5 border border-white/5">
        //       {(['day', 'month', 'season', 'year', 'lifetime'] as RangeOption[]).map((opt) => (
        //         <button key={opt} onClick={() => handleRangeChange(opt)}
        //           className={`px-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
        //             range === opt ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
        //           }`}
        //         >{opt}</button>
        //       ))}
        //     </div>

        //     {/* Contrôleur de Navigation Temporelle */}
        //     <div className="min-w-[40%] justify-between flex items-center gap-1 bg-black/40 rounded-xl border border-white/5">
        //       <button onClick={() => setOffset(prev => prev + 1)} disabled={range === 'lifetime'}
        //         className="px-2 py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
        //       ><Minus size={16} strokeWidth={3}/></button>

        //       <p className="text-sm font-black uppercase italic tracking-tighter leading-none">
        //         {displayLabel}
        //       </p>

        //       <button onClick={() => setOffset(prev => Math.max(0, prev - 1))} disabled={range === 'lifetime' || offset === 0}
        //         className="px-2 py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
        //       ><Plus size={16} strokeWidth={3} /></button>
        //     </div>
        //   </div>
        // </div>

        // <ResumeCanvas range={displayLabel} widgets={widgets} setWidgets={setWidgets} onSelectWidget={setSelectedWidget}/>
    //   </div>

    //   {/* PANNEAU DROIT : OPTIONS */}
    //   <div className='flex-1 min-w-[24%] max-w-[24%]'>
        // <div className="flex px-6 pt-4 pb-3 border-l border-white/10 justify-between">
        //   <SecondaryButton onClick={exportImage} additional='px-5 py-2 gap-2'>
        //     <Download size={20}/> {t.resume.download || "Télécharger"}
        //   </SecondaryButton>
        //   <PrimaryButton additional='px-8 py-2 gap-2 font-bold'>
        //     <Share2 size={18}/> {t.resume.share || "Partager"}
        //   </PrimaryButton>
        // </div>
        
        // <PropertiesView selectedWidget={selectedWidget} setSelectedWidget={setSelectedWidget} setWidgets={setWidgets} exportImage={exportImage}/>

        // <p className="p-4 bg-vert/10 border border-vert/20 text-[10px] text-vert font-bold uppercase leading-tight">
        //   Sélectionnez un élément sur la grille pour le modifier.
        // </p>
    //   </div>
    // </div>
    // <div className="min-h-screen bg-black text-white p-4 md:pt-6 md:p-4 animate-in fade-in duration-700">
    //   {/* HEADER ACTIONS */}
    //   <HeaderComponent range={range} setRange={setRange} offset={offset} setOffset={setOffset} sortBy={sortBy} setSortBy={setSortBy} displayLabel={displayLabel}/>
    // </div>
  );
}