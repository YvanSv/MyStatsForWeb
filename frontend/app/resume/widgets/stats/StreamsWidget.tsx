import Widget from "../Widget";
import { Play } from "lucide-react";

interface StreamsWidgetProps {
  w: number;
  h: number;
  streams: number;
  settings: any;
}

export function StreamsWidget({ w, h, streams, settings }: StreamsWidgetProps) {
  const color = settings?.color || "#1DB954";
  const showIcon = settings?.showIcon ?? true;
  const label = settings?.label || "Streams";

  // Formate le nombre en "1.2k" ou "1.2M" si l'utilisateur le souhaite
  const formatNumber = (num: number) => {
    if (!settings?.shorten) return num.toLocaleString();
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const layouts = {
    // 1x1 : Le petit bouton de lecture stylisé
    "1x1": (
      <div className="w-full h-full flex flex-col items-center justify-center rounded-xl">
        {showIcon && <Play size={14} style={{ color }} className="mb-1"/>}
        <span className="text-sm font-black tracking-tighter text-white leading-none">
          {formatNumber(streams)}
        </span>
        <span className="text-[7px] uppercase font-bold text-gray-500 tracking-widest mt-1">{label}</span>
      </div>
    ),

    // 2x1 ou 3x1 : Le bandeau de stats
    "2x1": (
      <div className="w-full h-full flex items-center gap-4 px-3 rounded-xl overflow-hidden">
        {showIcon && <Play size={20} fill={color} stroke={color} className="shrink-0"/>}
        <div className="flex flex-col min-w-0">
          <span className="text-[14px] font-black italic truncate uppercase" style={{ color }}>
            {formatNumber(streams)}
          </span>
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">
            {label}
          </span>
        </div>
      </div>
    ),

    // 2x2 ou plus : Le format "Certification"
    "2x2": (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative rounded-2xl">
        {showIcon && <Play size={32} fill={color} stroke={color} className="shrink-0 relative z-10"/>}
        <span className="text-3xl font-black tracking-tighter text-white relative z-10">
          {formatNumber(streams)}
        </span>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-2 relative z-10">
          {label}
        </span>
      </div>
    )
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts} />
    </div>
  );
}

export function StreamsSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-6">
      {/* Couleur */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Couleur accentuée</label>
        <div className="flex gap-2">
          {["#1DB954", "#FFFFFF", "#38BDF8", "#A855F7"].map(c => (
            <button key={c} onClick={() => update('color', c)}
              className={`w-6 h-6 rounded-full border-2 ${settings.color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Libellé personnalisé */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Titre du widget</label>
        <input 
          type="text" 
          value={settings.label || "Total Streams"} 
          onChange={(e) => update('label', e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-vert outline-none"
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <button onClick={() => update('showIcon', !settings.showIcon)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
        >
          Afficher l'icône
          <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.showIcon ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.showIcon ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
        </button>

        <button onClick={() => update('shorten', !settings.shorten)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
        >
          Abréger (1.2M)
          <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.shorten ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.shorten ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>
    </div>
  );
}