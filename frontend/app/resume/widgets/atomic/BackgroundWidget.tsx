import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { Sun, Droplets, Palette, Square } from "lucide-react";

interface BackgroundWidgetProps {
  w: number;
  h: number;
  data: string; // URL de l'image de fond
  settings: any;
}

// Valeur CSS `url(...)` sûre : seules les URL https, les chemins du site et les images data: usuelles sont acceptées,
// et l'URL est mise entre guillemets avec ses caractères spéciaux échappés (aucune injection de second url() ou de déclaration).
// Sans image valide : « none » (et non url(null) / url(undefined)).
const SAFE_IMAGE_URL = /^(https:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp|gif);base64,)/i;
export function toCssUrl(value: unknown): string {
  if (typeof value !== "string" || !SAFE_IMAGE_URL.test(value.trim())) return "none";
  const escaped = value.trim().replace(/[\\"\n\r\f]/g, (c) => (c === "\\" || c === '"' ? "\\" + c : "\\" + c.charCodeAt(0).toString(16) + " "));
  return `url("${escaped}")`;
}

export function BackgroundWidget({ w, h, data, settings }: BackgroundWidgetProps) {
  // Récupération des réglages (avec valeurs par défaut sécurisées)
  const blur = settings?.blur ?? 10; // Flou en pixels
  const opacity = settings?.opacity ?? 0.3; // Opacité de l'image (0 à 1)
  const gradient = settings?.gradient ?? true; // Activer le dégradé vers le noir en bas

  // Style pour l'image de fond
  const backgroundStyle = {
    backgroundImage: toCssUrl(data),
    filter: `blur(${blur}px)`,
    opacity: opacity,
  };

  // Conteneur commun pour les layouts
  const containerClass = "w-full h-full relative overflow-hidden bg-black rounded-xl";

  const layouts = {
    // Layout unique pour le background : il remplit tout le widget
    "1x1": (
      <div className={containerClass}>
        {/* L'image floutée */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-500"
          style={backgroundStyle}
        />

        {/* Le dégradé optionnel vers le noir (style Spotify) */}
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
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* SECTION EFFETS VISUELS */}
      <div className="flex flex-col gap-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.resume.wAmbiance}</label>
        
        {/* Slider Flou */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><Droplets size={12}/> {t.resume.wBlur}</span>
            <span className="font-mono text-vert">{settings?.blur ?? 10}px</span>
          </div>
          <input type="range" min="0" max="40" step="1" aria-label={t.resume.wBlur}
            value={settings?.blur ?? 10}
            onChange={(e) => update('blur', parseInt(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"
          />
        </div>

        {/* Slider Opacité */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><Sun size={12}/> {t.resume.wOpacity}</span>
            <span className="font-mono text-vert">{Math.round((settings?.opacity ?? 0.3) * 100)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.05" aria-label={t.resume.wOpacity}
            value={settings?.opacity ?? 0.3}
            onChange={(e) => update('opacity', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"
          />
        </div>
      </div>

      {/* SECTION DÉGRADÉ */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.resume.wFinish}</label>
        <button 
          type="button" aria-pressed={settings?.gradient ?? true} onClick={() => update('gradient', !(settings?.gradient ?? true))}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-[10px] font-bold"
        >
          {t.resume.wGradient}
          <div className={`w-8 h-4 rounded-full p-0.5 transition-all ${settings?.gradient ?? true ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.gradient ?? true ? 'translate-x-3.5' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>
    </div>
  );
}