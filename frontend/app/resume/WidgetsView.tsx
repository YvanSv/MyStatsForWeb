import type { ResumeData } from "./interfaces";
import { WIDGET_CATEGORIES, widgetsOfCategory } from "./widgetRegistry";
import { AccordionSection } from "./AccordionSection";
import { useLanguage } from "../context/languageContext";

interface WidgetsViewProps {
  resumeData: ResumeData;
}

export function WidgetsView({resumeData}:WidgetsViewProps) {
  const { t } = useLanguage();
  const r = t.resume;
  const n = (v: number) => v.toLocaleString(t.common.locale);
  return (
    <div data-testid="widgets-panel" className="flex flex-col flex-1 min-h-0 pl-2 pt-3 border-t border-white/10">
      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 italic shrink-0">
        {r.availableWidgets}
      </p>

      <div data-testid="widgets-scroll" className="flex-1 min-h-0 pl-1 pr-2 gap-3 flex flex-col overflow-y-auto custom-scrollbar">
        {WIDGET_CATEGORIES.map(({ id, titleKey }) => (
          <AccordionSection key={id} title={r[titleKey]} defaultOpen={false}>
            {widgetsOfCategory(id).map((def) => {
              const data = def.select(resumeData);
              const subtitle = typeof def.subtitle === "function" ? def.subtitle(data, { r, n }) : r[def.subtitle];
              return <DraggablePreview key={def.type} title={r[def.labelKey]} type={def.type} subtitle={subtitle} icon={def.icon}/>;
            })}
          </AccordionSection>
        ))}
      </div>
    </div>
  );
}

// Petit composant interne pour la prévisualisation des éléments
function DraggablePreview({ title, subtitle, icon, type }: { title: string, subtitle?: string, icon: string, type: string }) {
  const { t } = useLanguage();
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("widgetType", type);
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
        <span className="text-[10px] font-black uppercase text-white">{title}</span>
        <span className="text-[10px] text-gray-500 truncate font-medium uppercase">{subtitle || t.resume.noValue}</span>
      </div>
    </div>
  );
}
