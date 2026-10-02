import { Sun } from "lucide-react";
import type { LogoWidgetSettings } from "../../interfaces";
import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { APP_NAME } from "../../../constants/app";
import { DEFAULT_LOGO_OPACITY, finiteOrNull } from "../common";

const LOGO_SRC = "/logo.png";

const clampOpacity = (v: unknown) => Math.min(1, Math.max(0, finiteOrNull(v) ?? DEFAULT_LOGO_OPACITY));

export function LogoWidget({ w, h, settings }: { w: number; h: number; data?: unknown; settings?: LogoWidgetSettings }) {
  const opacity = clampOpacity(settings?.opacity);
  const box = (cls: string, img: string, text: string) => (
    <div className={`w-full h-full flex items-center justify-center overflow-hidden ${cls}`} style={{ opacity }} data-testid="logo-box">
      <img src={LOGO_SRC} alt="" className={`${img} object-contain`}/>
      <span className={`${text} font-black uppercase tracking-[0.2em] text-white truncate`}>{APP_NAME}</span>
    </div>
  );
  const layouts = {
    "1x1": box("flex-col gap-1 px-1", "w-8 h-8", "text-[7px] max-w-full"),
    "2x1": box("gap-2 px-2", "w-10 h-10", "text-sm"),
    "2x2": box("flex-col gap-2 p-2", "w-20 h-20", "text-lg max-w-full"),
  };
  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}

export function LogoSettings({ settings, onChange }: { settings?: LogoWidgetSettings; onChange: (s: LogoWidgetSettings) => void }) {
  const { t } = useLanguage();
  const opacity = clampOpacity(settings?.opacity);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
        <span className="flex items-center gap-1.5"><Sun size={12}/> {t.resume.wLogoOpacity}</span>
        <span className="font-mono text-vert">{Math.round(opacity * 100)}%</span>
      </div>
      <input type="range" min="0" max="1" step="0.05" aria-label={t.resume.wLogoOpacity} value={opacity}
        onChange={(e) => onChange({ ...settings, opacity: parseFloat(e.target.value) })}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"/>
    </div>
  );
}
