import { useId } from "react";
import type { FreeTextWidgetSettings, TextAlign } from "../../interfaces";
import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { ColorSwatchPicker } from "../ColorSwatchPicker";
import { SegmentedPicker } from "../SegmentedPicker";
import { SettingLabel } from "../SettingLabel";
import { COLORS } from "../../../constants/ui";
import { FREE_TEXT_MAX_LENGTH, TEXT_SIZES, WIDGET_COLORS } from "../common";
import { isTextSize, sizeOptions } from "./PeriodWidget";

const ALIGN_CLASS: Record<TextAlign, string> = { left: "justify-start text-left", center: "justify-center text-center", right: "justify-end text-right" };
const isAlign = (v: unknown): v is TextAlign => v === "left" || v === "center" || v === "right";

export function FreeTextWidget({ w, h, settings }: { w: number; h: number; data?: unknown; settings?: FreeTextWidgetSettings }) {
  const { t } = useLanguage();
  const color = settings?.color || COLORS.WHITE;
  const align: TextAlign = isAlign(settings?.textAlign) ? settings.textAlign : "center";
  const sizes = TEXT_SIZES[isTextSize(settings?.size) ? settings.size : "md"];
  const text = typeof settings?.text === "string" ? settings.text.slice(0, FREE_TEXT_MAX_LENGTH) : "";

  const cell = (key: keyof typeof sizes) => (
    <div className={`w-full h-full flex items-center px-1 overflow-hidden ${ALIGN_CLASS[align]}`}>
      {text.trim() ? (
        <span className={`${sizes[key]} font-black leading-tight break-words max-w-full`} style={{ color }}>{text}</span>
      ) : (
        // Invite d'édition : absente de l'image exportée
        <span data-export-ignore="true" className="text-[9px] italic text-white/30">{t.resume.wTextPlaceholder}</span>
      )}
    </div>
  );
  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={{ "1x1": cell("1x1"), "2x1": cell("2x1"), "2x2": cell("2x2") }}/>
    </div>
  );
}

export function FreeTextSettings({ settings, onChange }: { settings?: FreeTextWidgetSettings; onChange: (s: FreeTextWidgetSettings) => void }) {
  const { t } = useLanguage();
  const id = useId();
  const update = <K extends keyof FreeTextWidgetSettings>(key: K, value: FreeTextWidgetSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <SettingLabel htmlFor={id}>{t.resume.wText}</SettingLabel>
        <textarea id={id} rows={3} maxLength={FREE_TEXT_MAX_LENGTH} value={settings?.text ?? ""} placeholder={t.resume.wTextPlaceholder}
          onChange={(e) => update("text", e.target.value.slice(0, FREE_TEXT_MAX_LENGTH))}
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-vert outline-none resize-none"/>
        <span className="text-[9px] text-gray-500 text-right">{(settings?.text ?? "").length}/{FREE_TEXT_MAX_LENGTH}</span>
      </div>
      <ColorSwatchPicker colors={WIDGET_COLORS} value={settings?.color} onChange={(c) => update("color", c)} label={t.resume.wTextColor}/>
      <SegmentedPicker label={t.resume.wAlign} value={settings?.textAlign ?? "center"} onChange={(a) => update("textAlign", a)}
        options={[{ id: "left", label: t.resume.wLeft }, { id: "center", label: t.resume.wCenter }, { id: "right", label: t.resume.wRight }]}/>
      <SegmentedPicker label={t.resume.wSize} value={settings?.size ?? "md"} options={sizeOptions(t.resume)} onChange={(s) => update("size", s)}/>
    </div>
  );
}
