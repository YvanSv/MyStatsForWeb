"use client";

import { Trash2 } from 'lucide-react';
import { useLanguage } from '../context/languageContext';
import React, { useEffect, useRef, useState } from 'react';
import { PlacedWidget, ResumeData, SelectedWidget } from './interfaces';
import { GRID_CELLS, GRID_COLS, GRID_ROWS, fitsInGrid, nextWidgetId, moveWidgetTo, pointerToCell, pointerToGrid, type GridCell } from './gridLayout';
import { getWidgetDefinition, isWidgetType } from './widgetRegistry';

interface ResumeCanvasProps {
  range: string | number;
  resumeData: ResumeData;
  widgets: PlacedWidget[];
  setWidgets: React.Dispatch<React.SetStateAction<PlacedWidget[]>>;
  onSelectWidget: (w: SelectedWidget | null) => void;
  /** Sélection pilotée par le parent (liste des calques) ; absente, le canvas la gère seul. */
  selectedId?: number | null;
}

export default function ResumeCanvas({range,resumeData,widgets,setWidgets,onSelectWidget,selectedId: controlledId}:ResumeCanvasProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [resizingConfig, setResizingConfig] = useState<{id: number, handle: string} | null>(null);
  const [localId, setSelectedId] = useState<number | null>(null);
  const selectedId = controlledId !== undefined ? controlledId : localId;
  const gridRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Glisser en cours (ref : lu par les gestionnaires sans re-rendu). `active` passe à vrai après le seuil de 4 px.
  const dragRef = useRef<{ id: number; pointerId: number; startX: number; startY: number; grab: GridCell; origIndex: number; active: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const deleteWidget = (idToDelete: number) => {
    // Si le widget supprimé est celui sélectionné
    if (selectedId === idToDelete) {
      setSelectedId(null);       // Enlève la bordure verte localement
      onSelectWidget(null); // Vide les propriétés dans le parent
    }
    
    setWidgets(prev => prev.filter(w => w.id !== idToDelete));
  };

  // RESIZE
  const startResize = (e: React.MouseEvent, id: number, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingConfig({ id, handle });
  };

  // Toujours la dernière version de deselect (donc du onSelectWidget courant) sans réabonner l'écouteur
  const deselectRef = useRef<() => void>(() => {});
  const cancelDragRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dragRef.current) cancelDragRef.current(); // Échap pendant un glisser : annule le déplacement, sans désélectionner
      else deselectRef.current();
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

      // Position de la souris convertie en index de grille (ex: 1.5, 2.2)
      const { col: mouseCol, row: mouseRow } = pointerToGrid(gridRef.current.getBoundingClientRect(), e.clientX, e.clientY);

      // Coordonnées actuelles du widget
      const oldColStart = widget.index % GRID_COLS;
      const oldRowStart = Math.floor(widget.index / GRID_COLS);
      const oldColEnd = oldColStart + widget.w;
      const oldRowEnd = oldRowStart + widget.h;

      let newColStart = oldColStart;
      let newRowStart = oldRowStart;
      let newColEnd = oldColEnd;
      let newRowEnd = oldRowEnd;

      // --- CALCUL SELON LE COIN ---
      if (handle.includes('bottom')) {
        newRowEnd = Math.max(oldRowStart + 1, Math.min(GRID_ROWS, Math.ceil(mouseRow)));
      }
      if (handle.includes('top')) {
        newRowStart = Math.max(0, Math.min(oldRowEnd - 1, Math.floor(mouseRow)));
      }
      if (handle.includes('right')) {
        newColEnd = Math.max(oldColStart + 1, Math.min(GRID_COLS, Math.ceil(mouseCol)));
      }
      if (handle.includes('left')) {
        newColStart = Math.max(0, Math.min(oldColEnd - 1, Math.floor(mouseCol)));
      }

      // --- APPLICATION DES NOUVELLES VALEURS ---
      const newW = newColEnd - newColStart;
      const newH = newRowEnd - newRowStart;
      const newIndex = newColStart + (newRowStart * GRID_COLS);

      if (newW !== widget.w || newH !== widget.h || newIndex !== widget.index) {
        // Le chevauchement d'un autre widget est permis (empilement) ; les bornes de la grille sont déjà respectées ci-dessus
        const next = { index: newIndex, w: newW, h: newH };
        setWidgets(prev => prev.map(w => (w.id === id ? { ...w, ...next } : w)));
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
  }, [resizingConfig, widgets, setWidgets]);


  const showGrid = () => {
    if (!isDragging) setIsDragging(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDragLeave = (e: React.DragEvent) => {
    // Passer d'une cellule à l'autre déclenche un dragleave : on ne masque la grille
    // que si le curseur quitte réellement la zone
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setIsDragging(false);
    
    const type = e.dataTransfer.getData("widgetType");
    if (!isWidgetType(type)) return; // type vide ou inconnu : pas de widget fantôme
    const { defaultSize, defaultSettings } = getWidgetDefinition(type);

    // Mise à jour fonctionnelle : id calculé sur l'état le plus récent. Sur une case occupée, le widget
    // est ajouté en fin de tableau, donc au-dessus de tous les autres.
    setWidgets(prev => {
      const footprint = { index: targetIndex, ...defaultSize };
      if (!fitsInGrid(footprint)) return prev;
      const newWidget: PlacedWidget = { id: nextWidgetId(prev), type, ...footprint, settings: { ...defaultSettings } } as PlacedWidget;
      return [...prev, newWidget];
    });
  };

  const selectedWidget = widgets.find(w => w.id === selectedId);

  // Un widget recouvre les cases de fond : un dépôt sur lui vise la case située sous le curseur
  const onDropOnWidget = (e: React.DragEvent) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * GRID_COLS)));
    const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * GRID_ROWS)));
    onDrop(e, row * GRID_COLS + col);
  };

  const gridMetrics = () => {
    const layer = layerRef.current?.getBoundingClientRect();
    return layer && layer.width > 0 && layer.height > 0 ? layer : gridRef.current?.getBoundingClientRect() ?? null;
  };

  const widgetLabel = (w: PlacedWidget) => (isWidgetType(w.type) ? t.resume[getWidgetDefinition(w.type).labelKey] : String(w.type));
  const announceMove = (w: PlacedWidget, index: number) => setAnnouncement(`${widgetLabel(w)} ${t.resume.widgetMoved}, ${t.resume.layerCell} ${index}`);

  // DÉPLACEMENT (Pointer Events : souris et tactile). Un clic sans mouvement reste une simple sélection.
  const onWidgetPointerDown = (e: React.PointerEvent<HTMLDivElement>, w: PlacedWidget) => {
    if (e.button !== 0 || !e.isPrimary) return;
    const rect = gridMetrics();
    if (!rect) return;
    suppressClickRef.current = false;
    const cell = pointerToCell(rect, e.clientX, e.clientY);
    const col0 = w.index % GRID_COLS, row0 = Math.floor(w.index / GRID_COLS);
    const grab = { col: Math.min(w.w - 1, Math.max(0, cell.col - col0)), row: Math.min(w.h - 1, Math.max(0, cell.row - row0)) };
    dragRef.current = { id: w.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, grab, origIndex: w.index, active: false };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* capture indisponible : le glisser fonctionne tant que le pointeur reste sur le widget */ }
  };

  const onWidgetPointerMove = (e: React.PointerEvent<HTMLDivElement>, w: PlacedWidget) => {
    const d = dragRef.current;
    if (!d || d.id !== w.id || d.pointerId !== e.pointerId) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
      d.active = true;
      setIsDragging(true);
      setDraggedId(w.id);
      handleSelect(w);
    }
    const rect = gridMetrics();
    if (!rect) return;
    const cell = pointerToCell(rect, e.clientX, e.clientY);
    // Mise à jour fonctionnelle : seule la position change, l'ordre du tableau (empilement) reste intact
    setWidgets(prev => prev.map(x => {
      if (x.id !== d.id) return x;
      const moved = moveWidgetTo(x, cell, d.grab);
      return moved === x ? x : moved;
    }));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>, w: PlacedWidget, cancelled: boolean) => {
    const d = dragRef.current;
    if (!d || d.id !== w.id || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* déjà relâchée */ }
    if (!d.active) return;
    setIsDragging(false);
    setDraggedId(null);
    suppressClickRef.current = true; // le clic qui suit le relâchement ne doit pas re-sélectionner
    if (cancelled) restoreOrigin(d.id, d.origIndex);
    else {
      const final = widgetsRef.current.find(x => x.id === d.id);
      if (final) announceMove(final, final.index);
    }
  };

  const restoreOrigin = (id: number, index: number) => {
    setWidgets(prev => prev.map(x => (x.id === id && x.index !== index ? { ...x, index } : x)));
    setAnnouncement(t.resume.moveCancelled);
  };

  const widgetsRef = useRef(widgets);
  useEffect(() => { widgetsRef.current = widgets; });
  useEffect(() => {
    cancelDragRef.current = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !d.active) return;
      setIsDragging(false);
      setDraggedId(null);
      suppressClickRef.current = true;
      restoreOrigin(d.id, d.origIndex);
    };
  });

  // CLAVIER : flèches d'une case, seulement si le focus est sur le widget lui-même (pas dans un champ de réglages)
  const onWidgetKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, w: PlacedWidget) => {
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
    const delta = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
    if (!delta) return;
    e.preventDefault();
    const origin = { col: (w.index % GRID_COLS) + delta[0], row: Math.floor(w.index / GRID_COLS) + delta[1] };
    const moved = moveWidgetTo(w, origin);
    if (moved === w) return;
    setWidgets(prev => prev.map(x => (x.id === w.id ? moveWidgetTo(x, origin) : x)));
    handleSelect(w);
    announceMove(w, moved.index);
  };

  const handleSelect = (w: PlacedWidget) => {
    setSelectedId(w.id);
    // TS ne corrèle pas `type` et `settings` à travers l'union : on ne garde que id, type et réglages
    onSelectWidget({ id: w.id, type: w.type, settings: w.settings } as SelectedWidget);
  };

  const deselect = () => {
    setSelectedId(null);
    onSelectWidget(null); // On informe aussi le parent pour vider le panneau "Propriétés"
  };

  useEffect(() => { deselectRef.current = deselect; });

  return (
    <div id="capture-canvas" className="mt-2 flex flex-col bg-white/[0.02] w-[35%] rounded-xl border border-white/10">
      {/* CONTENEUR RELATIF QUI REGROUPE TOUT */}
      <div ref={gridRef} className="relative p-2 select-none"
        onDragLeave={onDragLeave} onDragOver={showGrid}
        onClick={(e) => {
          // Si on clique sur le padding ou entre les cases, on désélectionne
          if (e.target === e.currentTarget) deselect();
        }}
      >
        {/* 1. LA GRILLE DE FOND (Fixe, 15 cases) */}
        <div data-grid="cells" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`, opacity: isDragging || widgets.length === 0 ? 1 : 0 }}>
          {Array.from({ length: GRID_CELLS }).map((_, index) => (
            // La case garde sa taille dans l'export ; seul son visuel (cadre en pointillés, numéro) est ignoré
            <div key={`cell-${index}`} onDragOver={onDragOver} onDrop={(e) => onDrop(e, index)}
              className="relative aspect-square"
            >
              <div data-export-ignore="true"
                className="absolute inset-0 border border-dashed border-white/20 rounded-md flex items-center justify-center text-[8px] text-white/5 hover:bg-white/10 transition-colors"
              >{index}</div>
            </div>
          ))}
        </div>

        {/* 2. LE CALQUE DES WIDGETS (Superposé exactement au dessus) */}
        <div ref={layerRef} className="absolute inset-2 grid gap-2 pointer-events-none"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            // On force la création de toutes les lignes, même si elles sont vides
            gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
          }}
        >
          {widgets.map((w, position) => {
            const isSelected = selectedId === w.id;

            return (
              <div 
                key={w.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                  handleSelect(w);
                }}
                tabIndex={0} role="group" aria-label={`${widgetLabel(w)}, ${t.resume.layerCell} ${w.index}`}
                onKeyDown={(e) => onWidgetKeyDown(e, w)}
                onPointerDown={(e) => onWidgetPointerDown(e, w)}
                onPointerMove={(e) => onWidgetPointerMove(e, w)}
                onPointerUp={(e) => endDrag(e, w, false)}
                onPointerCancel={(e) => endDrag(e, w, true)}
                data-selected={isSelected ? "true" : undefined}
                onDragOver={onDragOver} onDrop={onDropOnWidget}
                className={`pointer-events-auto group relative touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-vert ${draggedId === w.id ? "cursor-grabbing" : "cursor-grab"}`}
                style={{
                  ...gridPlacement(w),
                  // Ordre d'empilement = ordre du tableau ; la sélection ou le survol ne le modifient jamais
                  zIndex: position + 1,
                }}
              >
                <div className="w-full h-full rounded-md text-black font-bold text-[10px] flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-white">
                  <WidgetContent widget={w} resumeData={resumeData} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. SURIMPRESSION : au-dessus de tous les widgets, anneau, poubelle et poignées du widget sélectionné
            (visibles et cliquables même s'il est recouvert). Exclue de l'export image. */}
        {selectedWidget && (
          <div data-export-ignore="true" data-testid="selection-overlay" className="absolute inset-2 grid gap-2 pointer-events-none"
            style={{ zIndex: widgets.length + 1, gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))` }}
          >
            <div className="relative" style={gridPlacement(selectedWidget)}>
              <div data-export-ignore="true" aria-hidden="true"
                className="absolute inset-0 rounded-md ring-2 ring-vert ring-offset-2 ring-offset-black pointer-events-none"
              />
              {/* --- BOUTON SUPPRIMER (POUBELLE) --- */}
              <button data-export-ignore="true" onClick={(e) => {e.stopPropagation();deleteWidget(selectedWidget.id)}} title={t.resume.deleteWidget} aria-label={t.resume.deleteWidget}
                className="pointer-events-auto absolute top-1 right-1 p-1.5 rounded-lg bg-black/50 text-white/70 hover:bg-black hover:text-red-500 transition-all active:scale-95"
              ><Trash2 size={14} strokeWidth={2.5} /></button>

              {/* --- LES 4 POIGNÉES DE REDIMENSIONNEMENT --- */}
              <ResizeHandle position="top-left" onMouseDown={(e) => startResize(e, selectedWidget.id, 'top-left')}/>
              <ResizeHandle position="top-right" onMouseDown={(e) => startResize(e, selectedWidget.id, 'top-right')}/>
              <ResizeHandle position="bottom-left" onMouseDown={(e) => startResize(e, selectedWidget.id, 'bottom-left')}/>
              <ResizeHandle position="bottom-right" onMouseDown={(e) => startResize(e, selectedWidget.id, 'bottom-right')}/>
            </div>
          </div>
        )}
      </div>

      <div data-export-ignore="true" aria-live="polite" className="sr-only">{announcement}</div>

      {/* BRANDING */}
      <div className={`px-2 py-1 flex items-center justify-center`}>
        <div className="text-[10px] uppercase text-center opacity-40 space-y-1">
          <p className="font-black tracking-[0.3em]">{t.resume.poweredBy} MyStats</p>
          <p className="font-medium">{range}</p>
        </div>
      </div>
    </div>
  );
}

const gridPlacement = (w: Pick<PlacedWidget, 'index' | 'w' | 'h'>) => ({
  gridColumn: `${(w.index % GRID_COLS) + 1} / span ${w.w}`,
  gridRow: `${Math.floor(w.index / GRID_COLS) + 1} / span ${w.h}`,
});

function ResizeHandle({ position, onMouseDown }: { position: string; onMouseDown: (e: React.MouseEvent) => void }) {
  // Styles de base communs à toutes les poignées
  const baseClass = "pointer-events-auto absolute w-4 h-4 flex items-center justify-center";
  
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
    <div data-export-ignore="true"
      onMouseDown={onMouseDown}
      className={`${baseClass} ${positionClasses[position]}`}
    ><div className={cornerVisuals[position]}/></div>
  );
}

/** Affiche un widget via le registre (composant et données propres à son type). */
function WidgetContent({ widget, resumeData }: { widget: PlacedWidget; resumeData: ResumeData }) {
  if (!isWidgetType(widget.type)) return null; // type inconnu (ancienne mise en page) : boîte vide
  const def = getWidgetDefinition(widget.type);
  const { Component } = def;
  return <Component w={widget.w} h={widget.h} data={def.select(resumeData)} settings={widget.settings} />;
}
