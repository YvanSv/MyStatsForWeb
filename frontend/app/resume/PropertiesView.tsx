import { Download, Share2 } from "lucide-react";
import { PlacedWidget, SelectedWidget } from "./interfaces";
import { ProfilePictureSettings } from "./widgets/atomic/ProfilePictureWidget";
import { useLanguage } from "../context/languageContext";
import { UsernameSettings } from "./widgets/atomic/UsernameWidget";
import { BackgroundSettings } from "./widgets/atomic/BackgroundWidget";
import { BioSettings } from "./widgets/atomic/BioWidget";
import { MinutesSettings } from "./widgets/stats/MinutesWidget";
import { StreamsSettings } from "./widgets/stats/StreamsWidget";
import { DistinctTracksSettings } from "./widgets/stats/DistinctTracksWidget";
import { DistinctAlbumsSettings } from "./widgets/stats/DistinctAlbumsWidget";
import { DistinctArtistsSettings } from "./widgets/stats/DistinctArtistsWidget";
import { PrimaryButton, SecondaryButton } from "../components/Atomic/Buttons";

interface PropertiesViewProps {
  selectedWidget: SelectedWidget | null;
  setSelectedWidget: (w:SelectedWidget | null) => void;
  setWidgets: React.Dispatch<React.SetStateAction<PlacedWidget[]>>;
  exportImage: () => void;
}

export function PropertiesView({selectedWidget, setSelectedWidget, setWidgets, exportImage}:PropertiesViewProps) {
  const { t } = useLanguage();

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

  return (
    <div className="pl-2 pt-3 border-t border-l border-white/10">
      <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 italic">
        Propriétés
      </h2>
      
      <div className='min-h-[427px] max-h-[427px] overflow-y-auto custom-scrollbar'>
        {selectedWidget && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-8 h-8 rounded-lg bg-vert/20 flex items-center justify-center text-vert text-xs font-bold">
                {selectedWidget.type[0].toUpperCase()}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{selectedWidget.type}</span>
            </div>

            {/* RENDER DES PARAMÈTRES SELON LE TYPE */}
            <div className="flex flex-col gap-4">
              {selectedWidget.type === 'profile_picture' && <ProfilePictureSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {selectedWidget.type === 'username' && <UsernameSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {selectedWidget.type === 'background' && <BackgroundSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {selectedWidget.type === 'bio' && <BioSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              
              {selectedWidget.type === 'minutes' && <MinutesSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {selectedWidget.type === 'streams' && <StreamsSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {selectedWidget.type === 'nb_tracks' && <DistinctTracksSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {selectedWidget.type === 'nb_albums' && <DistinctAlbumsSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {selectedWidget.type === 'nb_artists' && <DistinctArtistsSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
              {/* {selectedWidget.type === 'top_tracks' && (
                <TopTracksSettings settings={selectedWidget.settings} onChange={updateWidgetSettings} />
              )} */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}