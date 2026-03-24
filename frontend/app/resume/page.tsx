"use client";

import { Share2, Download, ListFilter, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../context/languageContext';
import { useEffect, useMemo, useState } from 'react';
import { useApiMyDatas } from '../hooks/useApiMyDatas';
import { LoadingSpinner } from '../components/small_elements/CustomSpinner';
import ResumeCanvas from './ResumeCanvas';
import { ProfilePictureSettings } from './widgets/ProfilePictureWidget';

type SortOption = "streams" | "minutes" | "rating";
type RangeOption = "day" | "month" | "season" | "year" | "lifetime";

interface UserProfile {
    display_name: string;
    bio: string;
    avatar: string;
    banner: string;
    perms: any[];
}

interface ItemBrief {
  name: string;
  minutes: number;
  rating: number;
  streams: number;
  image?: string;
}

interface DataFormat {
  user: UserProfile;
  topArtists: ItemBrief[];
  topTracks: ItemBrief[];
  topAlbums: ItemBrief[];
  minutes: number;
  streams: number;
}

interface PlacedWidget {
  id: number;
  type: string;
  index: number;
  data: any;
  w: number;
  h: number;
  settings: any;
}

interface SelectedWidget {
  id: number;
  type: string;
  settings: any;
}

export default function ResumePage() {
  const { t } = useLanguage();
  const { getResumeStats } = useApiMyDatas();
  const [loading, setLoading] = useState(true);
  const [resumeData, setResumeData] = useState<DataFormat | null>(null);
  const [widgets, setWidgets] = useState<PlacedWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<SelectedWidget | null>(null);
  // États pour les sélecteurs
  const [sortBy, setSortBy] = useState<SortOption>("streams");
  const [range, setRange] = useState<RangeOption>("year");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const fetchResume = async () => {
      setLoading(true);
      try {
        // On passe les paramètres à ton hook API
        const data = await getResumeStats({"range":range,"sort":sortBy,"offset":offset});
        setResumeData(data);
      } catch (error) {
        console.error("Erreur lors de la récupération du résumé:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [range, offset, sortBy]); // Se déclenche dès qu'un filtre change

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

  // Reset de l'offset quand on change de type de range
  const handleRangeChange = (newRange: RangeOption) => {
    setRange(newRange);
    setOffset(0);
  };

  // Fonction pour mettre à jour les réglages d'un widget depuis le panneau de droite
  const updateWidgetSettings = (newSettings: any) => {
    if (!selectedWidget) return;

    // 1. Mettre à jour l'état du widget sélectionné (pour le panneau de droite)
    setSelectedWidget({ ...selectedWidget, settings: newSettings });

    // 2. Mettre à jour le widget correspondant dans la liste du Canvas
    // Si tu as passé setWidgets à ton Canvas ou si l'état est dans la page :
    setWidgets(prev => prev.map(w => 
      w.id === selectedWidget.id ? { ...w, settings: newSettings } : w
    ));
  };

  if (!resumeData) return <LoadingSpinner />;

  return (
    <div className="bg-black text-white p-4 md:pt-6 md:p-4 animate-in fade-in duration-700">
      {/* HEADER ACTIONS */}
      <div className="mx-auto flex justify-between mb-4 px-4 md:px-12">
        <div className="flex flex-col items-start">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">{t.resume.title || "Your Universe"}</h1>
          <p className="text-gray-500 font-medium ml-3">Partagez un résumé</p>
        </div>

        {/* BARRE DE FILTRES */}
        <div className="flex flex-wrap justify-between items-center gap-4 p-2 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
          
          {/* Sélecteur de Tri */}
          <div className="flex items-center gap-2 bg-black/20 rounded-xl p-1 border border-white/5">
            <div className="p-2 text-gray-500"><ListFilter size={16} /></div>
            {[
              { id: 'streams', label: 'Streams' },
              { id: 'minutes', label: 'Temps' },
              { id: 'rating', label: 'Rating' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id as SortOption)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === opt.id 
                  ? "bg-white/10 text-white shadow-lg" 
                  : "text-gray-500 hover:text-gray-300"
                }`}
              >{opt.label}</button>
            ))}
          </div>

          <div className="hidden md:block w-px h-6 bg-white/10" />

          {/* Sélecteur de Type (Range) */}
          <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
            {(['day', 'month', 'season', 'year', 'lifetime'] as RangeOption[]).map((opt) => (
              <button key={opt} onClick={() => handleRangeChange(opt)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  range === opt ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
                }`}
              >{opt}</button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Contrôleur de Navigation Temporelle */}
          <div className="flex items-center w-xs justify-between gap-4 bg-black/40 rounded-xl p-1 border border-white/5">
            {/* Groupe Boutons +/- */}
            <div className="flex items-center gap-1">
              <button onClick={() => setOffset(prev => prev + 1)} disabled={range === 'lifetime'}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
              ><Minus size={16} strokeWidth={3}/></button>
            </div>

            {/* Affichage du Label */}
            <div className="flex flex-col w-2xs text-center bg-white/10 text-white rounded-2xl p-1.5 pr-4 shadow-inner">
              <span className="text-md font-black text-white uppercase italic tracking-tighter leading-none min-w-[120px]">
                {displayLabel}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setOffset(prev => Math.max(0, prev - 1))} disabled={range === 'lifetime' || offset === 0}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
              ><Plus size={16} strokeWidth={3} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid  */}
      {/* ZONE D'ÉDITION PRINCIPALE */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-5 items-start justify-center">
        {/* PANNEAU GAUCHE : ÉLÉMENTS À GLISSER */}
        <aside className="w-full lg:w-72 flex flex-col gap-6 order-2 lg:order-1">
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 italic">
              Éléments disponibles
            </h2>
            
            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {/* TERMINES */}
              <DraggablePreview title="Photo de profil" type='profile_picture' data={resumeData.user} subtitle={`Votre photo de profil`} icon="👤"/>

              {/* ENTAMES */}
              <DraggablePreview title="Profil" type='profile' data={resumeData.user} subtitle={`Votre profil`} icon="👤"/>
              <DraggablePreview title="Top Tracks" type='top_tracks' data={resumeData.topTracks} subtitle={"Top 5"} icon="🎵"/>

              {/* A FAIRE */}
              {/* <DraggablePreview title="Top Artistes" type='artists' data={""} subtitle={"Top 5"} icon="👤"/>
              <DraggablePreview title="Top Albums" type='albums' data={""} subtitle={"Top 5"} icon=""/>
              <DraggablePreview title="Temps d'écoute" type='minutes' data={""} subtitle={`${resumeData.minutes.toLocaleString()} min`} icon="⏳"/>
              <DraggablePreview title="Nombre de streams" type='streams' data={""} subtitle={`${resumeData.streams.toLocaleString()} streams`} icon=""/>
              <DraggablePreview title="Nombre d'artistes" type='nb_artists' data={""} subtitle={resumeData.minutes} icon=""/>
              <DraggablePreview title="Nombre de tracks" type='nb_tracks' data={""} subtitle={resumeData.minutes} icon=""/>
              <DraggablePreview title="Nombre d'albums" type='nb_albums' data={""} subtitle={resumeData.minutes} icon=""/>
              <DraggablePreview title="Background" type='background' data={""} subtitle={`Background personnalisé`} icon=""/>
              <DraggablePreview title="Stats Temps" type='minutes' data={""} subtitle={`${resumeData.minutes} min`} icon=""/> */}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-vert/10 border border-vert/20">
            <p className="text-[10px] text-vert font-bold uppercase leading-tight">
              Astuce : Glissez un élément sur la grille pour l'ajouter au visuel.
            </p>
          </div>
        </aside>

        {/* CENTRE : LE CANVAS 3x5 */}
        <main className="flex-1 flex justify-center order-1 lg:order-2">
           <ResumeCanvas range={displayLabel} widgets={widgets} setWidgets={setWidgets} onSelectWidget={(w) => setSelectedWidget(w)}/>
        </main>

        {/* PANNEAU DROIT : OPTIONS (Vide pour l'instant) */}
        <aside className="hidden xl:flex w-72 flex-col gap-5 order-3">
           <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md h-full min-h-[400px]">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 italic">
                Propriétés
              </h2>
              
              {selectedWidget ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-vert/20 flex items-center justify-center text-vert text-xs font-bold">
                      {selectedWidget.type[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedWidget.type}</span>
                  </div>

                  {/* RENDER DES PARAMÈTRES SELON LE TYPE */}
                  <div className="flex flex-col gap-4">
                    {selectedWidget.type === 'profile_picture' && (
                      <ProfilePictureSettings settings={selectedWidget.settings} onChange={updateWidgetSettings} />
                    )}
                    {/* {selectedWidget.type === 'top_tracks' && (
                      <TopTracksSettings settings={selectedWidget.settings} onChange={updateWidgetSettings} />
                    )} */}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-xs italic">Sélectionnez un élément sur la grille pour le modifier.</p>
              )}
           </div>
           <div className="flex p-5 justify-between rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md h-full">
            <button className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <Download size={20} />
            </button>
            <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-vert text-black font-bold hover:scale-105 transition-all active:scale-95 shadow-[0_0_20px_rgba(29,185,84,0.3)]">
              <Share2 size={18} /> {t.resume.share || "Partager"}
            </button>
          </div>
        </aside>

      </div>
      {/* <DesignCard resumeData={resumeData} t={t} sort={sortBy} range={displayLabel}/> */}
    </div>
  );
}

// Petit composant interne pour la prévisualisation des éléments
function DraggablePreview({ title, subtitle, icon, type, data }: { title: string, subtitle?: string, icon: string, type: string, data: any }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("widgetType", type);
    e.dataTransfer.setData("widgetData", JSON.stringify(data));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div draggable onDragStart={handleDragStart}
      className="group flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-vert/50 hover:bg-white/10 transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-[10px] font-black uppercase tracking-tighter text-white">{title}</span>
        <span className="text-[10px] text-gray-500 truncate font-medium uppercase">{subtitle || "N/A"}</span>
      </div>
    </div>
  );
}