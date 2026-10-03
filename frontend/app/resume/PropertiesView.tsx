import type { ComponentType } from "react";
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from "lucide-react";
import { AnyWidgetSettings, PlacedWidget, SelectedWidget } from "./interfaces";
import { useLanguage } from "../context/languageContext";
import { moveBackward, moveForward, moveToBack, moveToFront } from "./gridLayout";
import { AccordionSection } from "./AccordionSection";
import { getWidgetDefinition, type AnySettingsProps } from "./widgetRegistry";

interface PropertiesViewProps {
  /** Widgets du canvas, dans l'ordre d'empilement (le dernier est au-dessus). */
  widgets: PlacedWidget[];
  selectedWidget: SelectedWidget | null;
  setSelectedWidget: (w:SelectedWidget | null) => void;
  setWidgets: React.Dispatch<React.SetStateAction<PlacedWidget[]>>;
  exportImage: () => void;
}

export function PropertiesView({widgets, selectedWidget, setSelectedWidget, setWidgets}:PropertiesViewProps) {
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

  const selectLayer = (w: PlacedWidget) =>
    // TS ne corrèle pas `type` et `settings` à travers l'union : on ne garde que id, type et réglages
    setSelectedWidget({ id: w.id, type: w.type, settings: w.settings } as SelectedWidget);

  const reorder = (move: (list: PlacedWidget[], id: number) => PlacedWidget[]) => {
    if (selectedWidget) setWidgets(prev => move(prev, selectedWidget.id));
  };

  // Position dans l'empilement du widget sélectionné (-1 s'il n'est plus sur le canvas)
  const position = selectedWidget ? widgets.findIndex(w => w.id === selectedWidget.id) : -1;
  const atTop = position === -1 || position === widgets.length - 1;
  const atBottom = position <= 0;
  const orderButtons = [
    { label: t.resume.bringToFront, Icon: ChevronsUp, move: moveToFront, disabled: atTop },
    { label: t.resume.bringForward, Icon: ChevronUp, move: moveForward, disabled: atTop },
    { label: t.resume.sendBackward, Icon: ChevronDown, move: moveBackward, disabled: atBottom },
    { label: t.resume.sendToBack, Icon: ChevronsDown, move: moveToBack, disabled: atBottom },
  ];

  return (
    <div data-testid="properties-panel" className="flex flex-col flex-1 min-h-0 pl-2 pt-3 border-t border-l border-white/10">
      {/* Propriétés : prend tout l'espace libre ; l'en-tête reste fixe, seul son contenu défile (scrollPanel) */}
      <div data-testid="properties-section" className="flex flex-col flex-1 min-h-0 pr-2">
      <AccordionSection title={t.resume.properties} headingLevel={2} defaultOpen scrollPanel>
      {selectedWidget && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-vert/20 flex items-center justify-center text-vert text-xs font-bold">
              {widgetLabel(selectedWidget.type).charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{widgetLabel(selectedWidget.type)}</span>
          </div>

          {/* ORDRE D'EMPILEMENT */}
          <div role="group" aria-label={t.resume.stackingOrder} className="flex gap-2">
            {orderButtons.map(({ label, Icon, move, disabled }) => (
              <button key={label} type="button" title={label} aria-label={label} disabled={disabled}
                onClick={() => reorder(move)}
                className="p-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
              ><Icon size={16} strokeWidth={2.5} aria-hidden="true" /></button>
            ))}
          </div>

          {/* RENDER DES PARAMÈTRES SELON LE TYPE */}
          <div className="flex flex-col gap-4 mb-5">
            <WidgetSettingsPanel widget={selectedWidget} onChange={updateWidgetSettings}/>
          </div>
        </div>
      )}

      </AccordionSection>
      </div>

      {/* CALQUES : du plus haut au plus bas, pour atteindre aussi un widget recouvert */}
      {widgets.length > 0 && (
        <div data-testid="layers-section" className="shrink-0 mt-auto pr-2 border-t border-white/10">
        <AccordionSection title={t.resume.layers} headingLevel={2} defaultOpen={widgets.length >= 2} openMaxHeightClass="max-h-[2000px]">
          <ul aria-label={t.resume.layersListLabel} className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar p-1">
            {[...widgets].reverse().map((w) => {
              const isSelected = selectedWidget?.id === w.id;
              return (
                <li key={w.id}>
                  <button type="button" aria-pressed={isSelected} onClick={() => selectLayer(w)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vert ${
                      isSelected ? 'bg-vert/20 text-vert ring-1 ring-inset ring-vert' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold truncate">{widgetLabel(w.type)}</span>
                    <span className="shrink-0 text-[10px] opacity-60">{t.resume.layerCell} {w.index} · {w.w}×{w.h}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </AccordionSection>
        </div>
      )}
    </div>
  );
}

function WidgetSettingsPanel({ widget, onChange }: { widget: SelectedWidget; onChange: AnySettingsProps["onChange"] }) {
  const Settings = getWidgetDefinition(widget.type)?.Settings as ComponentType<AnySettingsProps> | null | undefined;
  return Settings ? <Settings settings={widget.settings} onChange={onChange}/> : null;
}
