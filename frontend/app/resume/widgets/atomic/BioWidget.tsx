import { SettingLabel } from "../SettingLabel";
import { useLanguage } from "../../../context/languageContext";
import { ColorSwatchPicker } from "../ColorSwatchPicker";
import Widget from "../Widget";
import { COLORS } from "../../../constants/ui";

interface BioWidgetProps {
  w: number;
  h: number;
  bio: string;
  settings: any;
}

const DEFAULT_BIO_COLOR = "#9CA3AF"; // Gris par défaut
const BIO_COLORS = [DEFAULT_BIO_COLOR, COLORS.WHITE, COLORS.SPOTIFY_GREEN, "#38BDF8", "#F1C40F"];

export function BioWidget({ w, h, bio, settings }: BioWidgetProps) {
  const { t } = useLanguage();
  const color = settings?.color || DEFAULT_BIO_COLOR;
  // La taille choisie s'applique dans tous les layouts ; sinon chaque layout garde sa taille d'origine
  const fontSize1x1 = settings?.fontSize || "text-[8px]";
  const fontSize = settings?.fontSize || "text-[10px]";
  const textAlign = settings?.textAlign || "left";
  const showQuotes = settings?.showQuotes ?? false;

  const containerClass = `w-full h-full flex flex-col justify-center ${
    textAlign === 'center' ? 'items-center text-center' : 
    textAlign === 'right' ? 'items-end text-right' : 'items-start text-left'
  }`;

  const layouts = {
    // Petit format : on tronque car 500 car. ne rentrent pas
    "1x1": (
      <div className={containerClass}>
        <p style={{ color }} className={`${fontSize1x1} leading-tight line-clamp-4 font-medium italic`}>
          {bio || t.resume.wBioEmpty1}
        </p>
      </div>
    ),
    // Format large ou vertical : on laisse couler le texte
    "2x2": (
      <div className={containerClass}>
        {showQuotes && <span className="text-vert text-2xl font-serif leading-none mb-1">“</span>}
        <p 
          style={{ color }} 
          className={`${fontSize} leading-relaxed font-medium transition-all duration-300`}
        >
          {bio || t.resume.wBioEmpty2}
        </p>
        {showQuotes && <span className="text-vert text-2xl font-serif leading-none mt-1">”</span>}
      </div>
    )
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts} />
    </div>
  );
}

export function BioSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });
  const { t } = useLanguage();

  const fontSizes = [
    { id: 'text-[8px]', label: 'XS' },
    { id: 'text-[10px]', label: 'S' },
    { id: 'text-[13px]', label: 'M' },
    { id: 'text-[16px]', label: 'L' },
  ];

  const currentColor = settings?.color || DEFAULT_BIO_COLOR;

  return (
    <div className="space-y-6">
      {/* Couleur */}
      <ColorSwatchPicker colors={BIO_COLORS} value={currentColor} onChange={(c) => update('color', c)} label={t.resume.wTextColor} />

      {/* Taille du texte */}
      <div className="flex flex-col gap-2">
        <SettingLabel>{t.resume.wReadSize}</SettingLabel>
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          {fontSizes.map((f) => (
            <button key={f.id} type="button" title={t.resume.wSizeTitle(f.label)} aria-pressed={settings?.fontSize === f.id} onClick={() => update('fontSize', f.id)}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${settings?.fontSize === f.id ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alignement Horizontal */}
      <div className="flex flex-col gap-2">
        <SettingLabel>{t.resume.wAlign}</SettingLabel>
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          {['left', 'center', 'right'].map((align) => (
            <button key={align} type="button" aria-pressed={settings?.textAlign === align} onClick={() => update('textAlign', align)}
              className={`flex-1 py-1 rounded-lg text-[9px] uppercase font-bold transition-all ${settings?.textAlign === align ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              {align === 'left' ? t.resume.wLeft : align === 'right' ? t.resume.wRight : t.resume.wCenter}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Guillemets */}
      <button 
        type="button" aria-pressed={!!settings?.showQuotes} onClick={() => update('showQuotes', !settings?.showQuotes)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-[10px] font-bold"
      >
        {t.resume.wQuoteStyle}
        <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.showQuotes ? 'bg-vert' : 'bg-white/20'}`}>
          <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.showQuotes ? 'translate-x-3' : 'translate-x-0'}`} />
        </div>
      </button>
    </div>
  );
}