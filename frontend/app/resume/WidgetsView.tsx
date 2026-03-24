import { DataFormat } from "./interfaces";

interface WidgetsViewProps {
  resumeData: DataFormat;
}

export function WidgetsView({resumeData}:WidgetsViewProps) {
  return (
    <aside className="w-full lg:w-72 flex flex-col gap-6 order-2 lg:order-1">
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 italic">
          Éléments disponibles
        </h2>
        
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {/* TERMINES */}
          <AccordionSection title="Atomic" defaultOpen={true}>
            <DraggablePreview title="Photo de profil" type='profile_picture' data={resumeData.user} subtitle="Votre avatar" icon="👤"/>
            <DraggablePreview title="Pseudonyme" type='username' data={resumeData.user.display_name} subtitle="Votre nom d'utilisateur" icon="🖋️"/>
            <DraggablePreview title="Fond d'écran" type='background' data={resumeData.user.banner} subtitle={`Votre bannière`} icon="🖼️"/>
            <DraggablePreview title="Description" type='bio' data={resumeData.user.bio} subtitle="Votre bio" icon="📝"/>
          </AccordionSection>

          {/* ENTAMES */}
          {/* <DraggablePreview title="Profil" type='profile' data={resumeData.user} subtitle={`Votre profil`} icon="👤"/>
          <DraggablePreview title="Top Tracks" type='top_tracks' data={resumeData.topTracks} subtitle={"Top 5"} icon="🎵"/> */}

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

import { ChevronDown } from "lucide-react";
import { useState } from "react";

function AccordionSection({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/5 last:border-none">
      <button 
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
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}