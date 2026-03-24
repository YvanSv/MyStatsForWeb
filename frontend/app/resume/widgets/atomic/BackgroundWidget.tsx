import Widget from "../Widget";
import { Sun, Droplets, Palette, Square } from "lucide-react";

interface BackgroundWidgetProps {
  w: number;
  h: number;
  data: string; // URL de l'image de fond
  settings: any;
}

export function BackgroundWidget({ w, h, data, settings }: BackgroundWidgetProps) {
  // Récupération des réglages (avec valeurs par défaut sécurisées)
  const blur = settings?.blur ?? 10; // Flou en pixels
  const opacity = settings?.opacity ?? 0.3; // Opacité de l'image (0 à 1)
//   const overlayColor = settings?.overlayColor || "#000000"; // Couleur du calque de superposition
  const gradient = settings?.gradient ?? true; // Activer le dégradé vers le noir en bas

  // Style pour l'image de fond
  const backgroundStyle = {
    backgroundImage: `url(${data})`,
    filter: `blur(${blur}px)`,
    opacity: opacity,
  };

  // Style pour le calque de couleur
//   const overlayStyle = {
//     backgroundColor: overlayColor,
//   };

  // Conteneur commun pour les layouts
  const containerClass = "w-full h-full relative overflow-hidden bg-black rounded-xl";

  const layouts = {
    // Layout unique pour le background : il remplit tout le widget
    "1x1": (
      <div className={containerClass}>
        {/* 1. L'image floutée */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-500"
          style={backgroundStyle}
        />
        
        {/* 2. Le calque de couleur superposé */}
        {/* <div 
          className="absolute inset-0 transition-colors duration-500"
          style={overlayStyle}
        /> */}

        {/* 3. Le dégradé optionnel vers le noir (style Spotify) */}
        {gradient && (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
        )}
      </div>
    ),
  };

  return (
    <div className="w-full h-full">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}

export function BackgroundSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  // Fonction utilitaire pour simplifier les changements
  const update = (key: string, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  const colors = ["#000000", "#1A1A1A", "#121212", "#080808", "#1DB954"];

  return (
    <div className="space-y-6">
      {/* SECTION EFFETS VISUELS */}
      <div className="flex flex-col gap-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Effets d'ambiance</label>
        
        {/* Slider Flou */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><Droplets size={12}/> Intensité du flou</span>
            <span className="font-mono text-vert">{settings?.blur ?? 10}px</span>
          </div>
          <input type="range" min="0" max="40" step="1"
            value={settings?.blur ?? 10}
            onChange={(e) => update('blur', parseInt(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"
          />
        </div>

        {/* Slider Opacité */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><Sun size={12}/> Opacité de l'image</span>
            <span className="font-mono text-vert">{Math.round((settings?.opacity ?? 0.3) * 100)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.05"
            value={settings?.opacity ?? 0.3}
            onChange={(e) => update('opacity', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"
          />
        </div>
      </div>

      {/* SECTION COULEUR DE SUPERPOSITION */}
      {/* <div className="flex flex-col gap-3">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Palette size={13}/> Teinte du fond</label>
        <div className="flex gap-2.5">
          {colors.map(c => (
            <button key={c} onClick={() => update('overlayColor', c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${settings.overlayColor === c ? 'border-vert scale-110 shadow-lg' : 'border-white/10 hover:border-white/30'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Option pour une couleur personnalisée (simplifiée) *//*}
          <input type="color" value={settings.overlayColor || "#000000"} onChange={(e) => update('overlayColor', e.target.value)}
            className="w-7 h-7 rounded-full bg-transparent border-2 border-white/10 cursor-pointer p-0 overflow-hidden"
          />
        </div>
      </div> */}

      {/* SECTION DÉGRADÉ */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Finition</label>
        <button 
          onClick={() => update('gradient', !settings.gradient)}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-[10px] font-bold"
        >
          Dégradé vers le noir (bas)
          <div className={`w-8 h-4 rounded-full p-0.5 transition-all ${settings?.gradient ?? true ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.gradient ?? true ? 'translate-x-3.5' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>
    </div>
  );
}