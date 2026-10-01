import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { COLORS } from "../../../constants/ui";

interface UsernameWidgetProps {
  w: number;
  h: number;
  data: string;
  settings: any;
}

export function UsernameWidget({ w, h, data, settings }: UsernameWidgetProps) {
  const color = settings?.color || COLORS.WHITE;
  const italic = settings?.italic ?? false;
  const uppercase = settings?.uppercase ?? false;
  const textAlign = settings?.textAlign || "center";
  const verticalAlign = settings?.verticalAlign || "center";

  const vAlignMap: Record<string, string> = {
    top: "items-start",
    center: "items-center",
    bottom: "items-end"
  };

  const hAlignMap: Record<string, string> = {
    left: "justify-start text-left",
    center: "justify-center text-center",
    right: "justify-end text-right"
  };

  const textStyle = {
    color: color,
    textAlign: textAlign as any,
  };

  const containerClass = `w-full h-full flex ${vAlignMap[verticalAlign] ?? ""} ${hAlignMap[textAlign] ?? ""}`;

  const layouts = {
    "1x1": (
      <div className={containerClass}>
        <span style={textStyle} className={`text-[10px] font-black leading-none truncate ${italic ? 'italic' : ''} ${uppercase ? 'uppercase' : ''}`}>
          {data}
        </span>
      </div>
    ),
    "2x1": (
      <div className={containerClass}>
        <span style={textStyle} className={`text-lg font-black tracking-tighter truncate ${italic ? 'italic' : ''} ${uppercase ? 'uppercase' : ''}`}>
          {data}
        </span>
      </div>
    ),
    "2x2": (
      <div className={containerClass}>
        {/* <div className="w-8 h-1 bg-vert mb-2 opacity-50" style={{ backgroundColor: color }} /> */}
        <span style={textStyle} className={`text-2xl font-black leading-none break-words w-full
            ${italic ? 'italic' : ''} ${uppercase ? 'uppercase' : ''}`}
        >{data}</span>
        {/* <div className="w-8 h-1 bg-vert mt-2 opacity-50" style={{ backgroundColor: color }} /> */}
      </div>
    ),
    "1x2": (
      <div className={containerClass}>
        <span style={{ ...textStyle, writingMode: 'vertical-rl' }} className={`text-xl font-black rotate-180 tracking-widest
            ${italic ? 'italic' : ''} ${uppercase ? 'uppercase' : ''}`}
        >{data}</span>
      </div>
    ),
    "1x3": (
      <div className={containerClass}>
        <span style={{ ...textStyle, writingMode: 'vertical-rl' }} className={`text-xl font-black rotate-180 tracking-widest
            ${italic ? 'italic' : ''} ${uppercase ? 'uppercase' : ''}`}
        >{data}</span>
      </div>
    ),
    "1x4": (
      <div className={containerClass}>
        <span style={{ ...textStyle, writingMode: 'vertical-rl' }} className={`text-xl font-black rotate-180 tracking-widest
            ${italic ? 'italic' : ''} ${uppercase ? 'uppercase' : ''}`}
        >{data}</span>
      </div>
    )
  };

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}

export function UsernameSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });
  const { t } = useLanguage();

  const colors = [COLORS.SPOTIFY_GREEN, COLORS.WHITE, "#FF5733", "#3357FF", "#F1C40F"];

  return (
    <div className="space-y-6">
      {/* Couleur */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.resume.wTextColor}</label>
        <div className="flex gap-2">
          {colors.map(c => (
            <button 
              key={c} type="button" aria-label={c} aria-pressed={settings?.color === c}
              onClick={() => update('color', c)}
              className={`w-6 h-6 rounded-full border-2 ${settings?.color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Style de police */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          type="button" aria-pressed={!!settings?.italic} onClick={() => update('italic', !settings?.italic)}
          className={`p-2 rounded-lg text-[10px] font-bold border ${settings?.italic ? 'bg-white/10 border-vert text-vert' : 'border-white/5 text-gray-400'}`}
        >
          {t.resume.wItalic}
        </button>
        <button 
          type="button" aria-pressed={!!settings?.uppercase} onClick={() => update('uppercase', !settings?.uppercase)}
          className={`p-2 rounded-lg text-[10px] font-bold border ${settings?.uppercase ? 'bg-white/10 border-vert text-vert' : 'border-white/5 text-gray-400'}`}
        >
          {t.resume.wUppercase}
        </button>
      </div>

      {/* Alignement Horizontal */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.resume.wAlignH}</label>
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          {['left', 'center', 'right'].map((align) => (
            <button key={align} type="button" aria-pressed={settings?.textAlign === align} onClick={() => update('textAlign', align)}
              className={`flex-1 py-1 rounded-lg text-[9px] uppercase font-bold transition-all ${settings?.textAlign === align ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500'}`}
            >
              {align === 'left' ? t.resume.wLeft : align === 'right' ? t.resume.wRight : t.resume.wCenter}
            </button>
          ))}
        </div>
      </div>

      {/* Alignement Vertical */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.resume.wAlignV}</label>
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          {[
            { id: 'top', label: t.resume.wTop },
            { id: 'center', label: t.resume.wMiddle },
            { id: 'bottom', label: t.resume.wBottom }
          ].map((v) => (
            <button key={v.id} type="button" aria-pressed={settings?.verticalAlign === v.id} onClick={() => update('verticalAlign', v.id)}
              className={`flex-1 py-1 rounded-lg text-[9px] uppercase font-bold transition-all ${settings?.verticalAlign === v.id ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}