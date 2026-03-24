import { Download, Share2 } from "lucide-react";
import { PlacedWidget, SelectedWidget } from "./interfaces";
import { ProfilePictureSettings } from "./widgets/atomic/ProfilePictureWidget";
import { useLanguage } from "../context/languageContext";
import { UsernameSettings } from "./widgets/atomic/UsernameWidget";
import { BackgroundSettings } from "./widgets/atomic/BackgroundWidget";

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
                {selectedWidget.type === 'profile_picture' && <ProfilePictureSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
                {selectedWidget.type === 'username' && <UsernameSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
                {selectedWidget.type === 'background' && <BackgroundSettings settings={selectedWidget.settings} onChange={updateWidgetSettings}/>}
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
        <button onClick={exportImage} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          <Download size={20} />
        </button>
        <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-vert text-black font-bold hover:scale-105 transition-all active:scale-95 shadow-[0_0_20px_rgba(29,185,84,0.3)]">
          <Share2 size={18} /> {t.resume.share || "Partager"}
        </button>
      </div>
    </aside>
  );
}