import { DataFormat } from "./interfaces";
import { useLanguage } from "../context/languageContext";

interface WidgetsViewProps {
  resumeData: DataFormat;
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
        <AccordionSection title={r.sectionAccount} defaultOpen={false}>
          <DraggablePreview title={r.widgetProfilePicture} type='profile_picture' data={resumeData.user} subtitle={r.subtitleAvatar} icon="👤"/>
          <DraggablePreview title={r.widgetUsername} type='username' data={resumeData.user.display_name} subtitle={r.subtitleUsername} icon="🖋️"/>
          <DraggablePreview title={r.widgetBackground} type='background' data={resumeData.user.banner} subtitle={r.subtitleBanner} icon="🖼️"/>
          <DraggablePreview title={r.widgetBio} type='bio' data={resumeData.user.bio} subtitle={r.subtitleBio} icon="📝"/>
        </AccordionSection>

        <AccordionSection title={r.sectionStats} defaultOpen={false}>
          <DraggablePreview title={r.totalTime} type='minutes' data={resumeData.minutes} subtitle={`${n(resumeData.minutes)} ${r.unitMinutes}`} icon="⏳"/>
          <DraggablePreview title={r.totalStreams} type='streams' data={resumeData.streams} subtitle={`${n(resumeData.streams)} ${r.unitStreams}`} icon="▶️​"/>
          <DraggablePreview title={r.widgetTracks} type='nb_tracks' data={resumeData.distinct_tracks} subtitle={`${n(resumeData.distinct_tracks)} ${r.unitTracks}`} icon="💿"/>
          <DraggablePreview title={r.widgetAlbums} type='nb_albums' data={resumeData.distinct_albums} subtitle={`${n(resumeData.distinct_albums)} ${r.unitAlbums}`} icon="💽​"/>
          <DraggablePreview title={r.widgetArtists} type='nb_artists' data={resumeData.distinct_artists} subtitle={`${n(resumeData.distinct_artists)} ${r.unitArtists}`} icon="​🎤​"/>
        </AccordionSection>
      </div>
    </div>
  );
}

// Petit composant interne pour la prévisualisation des éléments
function DraggablePreview({ title, subtitle, icon, type, data }: { title: string, subtitle?: string, icon: string, type: string, data: any }) {
  const { t } = useLanguage();
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