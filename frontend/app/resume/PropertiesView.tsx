import type { ComponentType } from "react";
import { AnyWidgetSettings, PlacedWidget, SelectedWidget } from "./interfaces";
import { useLanguage } from "../context/languageContext";
import { getWidgetDefinition, type AnySettingsProps } from "./widgetRegistry";

interface PropertiesViewProps {
  selectedWidget: SelectedWidget | null;
  setSelectedWidget: (w:SelectedWidget | null) => void;
  setWidgets: React.Dispatch<React.SetStateAction<PlacedWidget[]>>;
  exportImage: () => void;
}

export function PropertiesView({selectedWidget, setSelectedWidget, setWidgets}:PropertiesViewProps) {
  const { t } = useLanguage();

  const widgetLabel = (type: SelectedWidget["type"]) => {
    const def = getWidgetDefinition(type);
    return def ? t.resume[def.labelKey] : type;
  };

  // Fonction pour mettre à jour les réglages d'un widget depuis le panneau de droite
  const updateWidgetSettings = (newSettings: AnyWidgetSettings) => {
    if (!selectedWidget) return;

    // 1. Mettre à jour l'état du widget sélectionné (pour le panneau de droite)
    // Le panneau affiché correspond au type du widget : les réglages reçus en sont donc bien ceux de ce type
    setSelectedWidget({ ...selectedWidget, settings: newSettings } as SelectedWidget);

    // 2. Mettre à jour le widget correspondant dans la liste du Canvas
    // Si tu as passé setWidgets à ton Canvas ou si l'état est dans la page :
    setWidgets(prev => prev.map(w => 
      w.id === selectedWidget.id ? ({ ...w, settings: newSettings } as PlacedWidget) : w
    ));
  };

  return (
    <div className="flex-1 pl-2 pt-3 border-t border-l border-white/10">
      <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 italic">
        {t.resume.properties}
      </h2>
      
      {selectedWidget && (
        <div className="pr-2 space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-y-auto custom-scrollbar max-h-[61vh]">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-vert/20 flex items-center justify-center text-vert text-xs font-bold">
              {widgetLabel(selectedWidget.type).charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{widgetLabel(selectedWidget.type)}</span>
          </div>

          {/* RENDER DES PARAMÈTRES SELON LE TYPE */}
          <div className="flex flex-col gap-4 mb-5">
            <WidgetSettingsPanel widget={selectedWidget} onChange={updateWidgetSettings}/>
          </div>
        </div>
      )}
    </div>
  );
}

function WidgetSettingsPanel({ widget, onChange }: { widget: SelectedWidget; onChange: AnySettingsProps["onChange"] }) {
  const Settings = getWidgetDefinition(widget.type)?.Settings as ComponentType<AnySettingsProps> | null | undefined;
  return Settings ? <Settings settings={widget.settings} onChange={onChange}/> : null;
}
