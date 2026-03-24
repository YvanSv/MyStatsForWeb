"use client";

import { Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ProfileWidget } from './widgets/ProfileWidgets';
import { TopFiveWidget } from './widgets/TopFiveWidget';
import { ProfilePictureWidget } from './widgets/atomic/ProfilePictureWidget';
import { PlacedWidget, SelectedWidget } from './interfaces';
import { UsernameWidget } from './widgets/atomic/UsernameWidget';

interface ResumeCanvasProps {
  range: string | number;
  widgets: PlacedWidget[];
  setWidgets: React.Dispatch<React.SetStateAction<PlacedWidget[]>>;
  onSelectWidget: (w: SelectedWidget | null) => void;
}

export default function ResumeCanvas({range,widgets,setWidgets,onSelectWidget}:ResumeCanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [resizingConfig, setResizingConfig] = useState<{id: number, handle: string} | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const deleteWidget = (idToDelete: number) => {
    // Si le widget supprimé est celui sélectionné
    if (selectedId === idToDelete) {
      setSelectedId(null);       // Enlève la bordure verte localement
      onSelectWidget(null as any); // Vide les propriétés dans le parent (le 'as any' si TS râle)
    }
    
    setWidgets(prev => prev.filter(w => w.id !== idToDelete));
  };

  // RESIZE
  const startResize = (e: React.MouseEvent, id: number, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingConfig({ id, handle });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") deselect();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingConfig || !gridRef.current) return;

      const { id, handle } = resizingConfig;
      const widget = widgets.find(w => w.id === id);
      if (!widget) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 3;
      const cellHeight = gridRect.height / 5;

      // Position de la souris convertie en index de grille (ex: 1.5, 2.2)
      const mouseCol = (e.clientX - gridRect.left) / cellWidth;
      const mouseRow = (e.clientY - gridRect.top) / cellHeight;

      // Coordonnées actuelles du widget
      const oldColStart = widget.index % 3;
      const oldRowStart = Math.floor(widget.index / 3);
      const oldColEnd = oldColStart + widget.w;
      const oldRowEnd = oldRowStart + widget.h;

      let newColStart = oldColStart;
      let newRowStart = oldRowStart;
      let newColEnd = oldColEnd;
      let newRowEnd = oldRowEnd;

      // --- CALCUL SELON LE COIN ---
      if (handle.includes('bottom')) {
        newRowEnd = Math.max(oldRowStart + 1, Math.min(5, Math.ceil(mouseRow)));
      }
      if (handle.includes('top')) {
        newRowStart = Math.max(0, Math.min(oldRowEnd - 1, Math.floor(mouseRow)));
      }
      if (handle.includes('right')) {
        newColEnd = Math.max(oldColStart + 1, Math.min(3, Math.ceil(mouseCol)));
      }
      if (handle.includes('left')) {
        newColStart = Math.max(0, Math.min(oldColEnd - 1, Math.floor(mouseCol)));
      }

      // --- APPLICATION DES NOUVELLES VALEURS ---
      const newW = newColEnd - newColStart;
      const newH = newRowEnd - newRowStart;
      const newIndex = newColStart + (newRowStart * 3);

      if (newW !== widget.w || newH !== widget.h || newIndex !== widget.index) {
        setWidgets(prev => prev.map(w => 
          w.id === id ? { ...w, w: newW, h: newH, index: newIndex } : w
        ));
      }
    };

    const stopResize = () => setResizingConfig(null);

    if (resizingConfig) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResize);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [resizingConfig, widgets]);


  const showGrid = () => {
    if (!isDragging) setIsDragging(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setIsDragging(false);
    
    const type = e.dataTransfer.getData("widgetType");
    const data = JSON.parse(e.dataTransfer.getData("widgetData"));

    // On ajoute le nouveau widget à notre liste
    const newWidget: PlacedWidget = {
      id: Date.now(),
      type: type,
      index: targetIndex,
      data: data,
      w: 1,
      h: 1,
      settings: {}
    };

    setWidgets([...widgets, newWidget]);
  };

  const handleSelect = (w: PlacedWidget) => {
    setSelectedId(w.id);
    onSelectWidget({
      id: w.id,
      type: w.type,
      settings: w.settings
    });
  };

  const deselect = () => {
    setSelectedId(null);
    onSelectWidget(null as any); // On informe aussi le parent pour vider le panneau "Propriétés"
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4 bg-white/[0.02] rounded-xl border border-white/10">
      {/* CONTENEUR RELATIF QUI REGROUPE TOUT */}
      <div ref={gridRef} className="relative p-2 select-none"
        onDragLeave={onDragLeave} onDragOver={showGrid}
        onClick={(e) => {
          // Si on clique sur le padding ou entre les cases, on désélectionne
          if (e.target === e.currentTarget) deselect();
        }}
      >
        {/* 1. LA GRILLE DE FOND (Fixe, 15 cases) */}
        <div className="grid grid-cols-3 gap-2 w-full" style={{ opacity: isDragging || widgets.length === 0 ? 1 : 0 }}>
          {Array.from({ length: 3 * 5 }).map((_, index) => (
            <div key={`cell-${index}`} onDragOver={onDragOver} onDrop={(e) => onDrop(e, index)}
              className="aspect-square border border-dashed border-white/20 rounded-md flex items-center justify-center text-[8px] text-white/5 hover:bg-white/10 transition-colors"
            >{index}</div>
          ))}
        </div>

        {/* 2. LE CALQUE DES WIDGETS (Superposé exactement au dessus) */}
        <div className="absolute inset-2 grid grid-cols-3 gap-2 pointer-events-none"
          style={{ 
            // On force la création des 5 lignes, même si elles sont vides
            gridTemplateRows: 'repeat(5, minmax(0, 1fr))' 
          }}
        >
          {widgets.map((w) => {
            const colStart = (w.index % 3) + 1;
            const rowStart = Math.floor(w.index / 3) + 1;
            const isSelected = selectedId === w.id;

            return (
              <div 
                key={w.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(w);
                }}
                className={`pointer-events-auto group relative cursor-pointer transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-vert ring-offset-2 ring-offset-black z-50' : 'hover:z-30'
                }`}
                style={{
                  gridColumn: `${colStart} / span ${w.w}`,
                  gridRow: `${rowStart} / span ${w.h}`,
                }}
              >
                <div className="w-full h-full rounded-md text-black font-bold text-[10px] flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-white">
                  {w.type === 'profile_picture' && <ProfilePictureWidget w={w.w} h={w.h} user={w.data} settings={w.settings}/>}
                  {w.type === 'username' && <UsernameWidget  w={w.w} h={w.h} data={w.data} settings={w.settings}/>}

                  {w.type === 'top_tracks' && <TopFiveWidget w={w.w} h={w.h} type='tracks' data={w.data}/>}
                  {w.type === 'profile' && <ProfileWidget w={w.w} h={w.h} user={w.data}/>}

                  {/* --- BOUTON SUPPRIMER (POUBELLE) --- */}
                  <button onClick={(e) => {e.stopPropagation();deleteWidget(w.id)}} title="Supprimer le widget"
                    className="absolute top-1 right-1 p-1.5 rounded-lg bg-black/50 text-white/70 hover:bg-black hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-40 active:scale-95"
                  ><Trash2 size={14} strokeWidth={2.5} /></button>
                  
                  {/* --- LES 4 POIGNÉES DE REDIMENSIONNEMENT --- */}
                  {/* Coin Supérieur Gauche (Top-Left) */}
                  <ResizeHandle position="top-left" onMouseDown={(e) => startResize(e, w.id, 'top-left')}/>
                  {/* Coin Supérieur Droit (Top-Right) */}
                  <ResizeHandle position="top-right" onMouseDown={(e) => startResize(e, w.id, 'top-right')}/>
                  {/* Coin Inférieur Gauche (Bottom-Left) */}
                  <ResizeHandle position="bottom-left" onMouseDown={(e) => startResize(e, w.id, 'bottom-left')}/>
                  {/* Coin Inférieur Droit (Bottom-Right) - L'originale */}
                  <ResizeHandle position="bottom-right" onMouseDown={(e) => startResize(e, w.id, 'bottom-right')}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BRANDING */}
      <div className={`col-span-3 relative overflow-hidden p-2 flex items-center justify-center`}>
        <div className="text-center opacity-40 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Generated with MyStats</p>
          <p className="text-[10px] uppercase font-medium">{range}</p>
        </div>
      </div>
    </div>
  );
}

function ResizeHandle({ position, onMouseDown }: { position: string; onMouseDown: (e: React.MouseEvent) => void }) {
  // Styles de base communs à toutes les poignées
  const baseClass = "absolute w-4 h-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center";
  
  // Styles spécifiques à chaque position (placement et curseur)
  const positionClasses: { [key: string]: string } = {
    'top-left': 'top-0 left-0 cursor-nw-resize',      // North-West
    'top-right': 'top-0 right-0 cursor-ne-resize',     // North-East
    'bottom-left': 'bottom-0 left-0 cursor-sw-resize', // South-West
    'bottom-right': 'bottom-0 right-0 cursor-se-resize', // South-East (l'originale)
  };

  // Les petits coins visuels (optionnel, pour le style)
  const cornerVisuals: { [key: string]: string } = {
    'top-left': 'w-2 h-2 border-t-2 border-l-2 border-black/50 rounded-tl-sm',
    'top-right': 'w-2 h-2 border-t-2 border-r-2 border-black/50 rounded-tr-sm',
    'bottom-left': 'w-2 h-2 border-b-2 border-l-2 border-black/50 rounded-bl-sm',
    'bottom-right': 'w-2 h-2 border-b-2 border-r-2 border-black/50 rounded-br-sm',
  };

  return (
    <div 
      onMouseDown={onMouseDown}
      className={`${baseClass} ${positionClasses[position]}`}
    ><div className={cornerVisuals[position]}/></div>
  );
}