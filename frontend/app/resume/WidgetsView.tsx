import type { ResumeData } from "./interfaces";
import { WIDGET_CATEGORIES, widgetsOfCategory } from "./widgetRegistry";
import { useLanguage } from "../context/languageContext";

interface WidgetsViewProps {
  resumeData: ResumeData;
}

export function WidgetsView({resumeData}:WidgetsViewProps) {
  const { t } = useLanguage();
  const r = t.resume;
  const n = (v: number) => v.toLocaleString(t.common.locale);
  return (
    <div className="flex-1 pl-2 pt-3 border-t border-white/10">
      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 italic shrink-0">
        {r.availableWidgets}
      </p>

      <div className="flex-1 pr-2 gap-3 flex flex-col overflow-y-auto custom-scrollbar max-h-[61vh]">
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

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

function AccordionSection({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-b border-white/5 last:border-none">
      <button 
        type="button" aria-expanded={isOpen} aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 hover:text-white transition-colors group"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-300 italic">
          {title}
        </span>
        <ChevronDown 
          size={14} 
          className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      <div id={panelId} inert={!isOpen} className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}