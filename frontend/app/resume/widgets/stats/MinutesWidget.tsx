import Widget from "../Widget";
import { Timer } from "lucide-react";

interface MinutesWidgetProps {
  w: number;
  h: number;
  minutes: number;
  settings: any;
}

export function MinutesWidget({ w, h, minutes, settings }: MinutesWidgetProps) {
  const color = settings?.color || "#1DB954";
  const showIcon = settings?.showIcon ?? true;
  const label = settings?.label || "Minutes d'écoute";
  const useSeparator = settings?.useSeparator ?? true;

  // Formatage du nombre (ex: 12543 -> 12 543)
  const formattedMinutes = useSeparator 
    ? minutes.toLocaleString() 
    : minutes.toString();

  const layouts = {
    // Format 1x1 : Le badge compact
    "1x1": (
      <div className="w-full h-full flex flex-col items-center justify-center rounded-xl">
        {showIcon && <Timer size={14} style={{ color }} className="mb-1" />}
        <span className="text-sm font-black tracking-tighter text-white leading-none">
          {formattedMinutes}
        </span>
        <span className="text-[7px] uppercase font-bold text-gray-500 tracking-widest mt-1">Min</span>
      </div>
    ),

    // Format 2x1 ou 3x1 : La barre horizontale
    "2x1": (
      <div className="w-full h-full flex items-center justify-between px-3 rounded-xl">
        <div className="flex flex-col">
          <span className="text-[8px] uppercase font-black text-gray-500 tracking-[0.2em] mb-1">{label}</span>
          <span className="text-xl font-black italic leading-none" style={{ color }}>{formattedMinutes}</span>
        </div>
        {showIcon && <Timer size={24} className="opacity-20 text-white" />}
      </div>
    ),

    // Format 2x2 ou 3x3 : Le Score Géant
    "2x2": (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
           <Timer size={120} strokeWidth={1} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2 italic">
          {label}
        </span>
        <span className="text-4xl font-black italic tracking-tighter leading-none mb-1" style={{ color }}>
          {formattedMinutes}
        </span>
        <div className="h-1 w-12 rounded-full" style={{ backgroundColor: color }} />
      </div>
    )
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts} />
    </div>
  );
}

export function MinutesSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-6">
      {/* Couleur du compteur */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Couleur accentuée</label>
        <div className="flex gap-2">
          {["#1DB954", "#FFFFFF", "#FBBF24", "#F87171"].map(c => (
            <button key={c} onClick={() => update('color', c)}
              className={`w-6 h-6 rounded-full border-2 ${settings.color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Libellé personnalisé */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Texte d'accompagnement</label>
        <input 
          type="text" 
          value={settings.label || "Minutes d'écoute"} 
          onChange={(e) => update('label', e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-vert outline-none"
        />
      </div>

      {/* Options Binaires */}
      <div className="space-y-2">
        <button onClick={() => update('showIcon', !settings.showIcon)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
        >
          Afficher l'icône
          <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.showIcon ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.showIcon ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
        </button>

        <button onClick={() => update('useSeparator', !settings.useSeparator)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
        >
          Séparateur de milliers (10 000)
          <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.useSeparator ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.useSeparator ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>
    </div>
  );
}