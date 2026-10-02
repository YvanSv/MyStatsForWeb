import type { PeriodWidgetSettings, TextSize } from "../../interfaces";
import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { ColorSwatchPicker } from "../ColorSwatchPicker";
import { SegmentedPicker } from "../SegmentedPicker";
import { COLORS } from "../../../constants/ui";
import { EMPTY_VALUE, TEXT_SIZES, WIDGET_COLORS } from "../common";

export const sizeOptions = (r: { wSmall: string; wMedium: string; wLarge: string }): { id: TextSize; label: string }[] => [
  { id: "sm", label: r.wSmall }, { id: "md", label: r.wMedium }, { id: "lg", label: r.wLarge },
];

export const isTextSize = (v: unknown): v is TextSize => v === "sm" || v === "md" || v === "lg";

export function PeriodWidget({ w, h, data, settings }: { w: number; h: number; data: string | number | undefined | null; settings?: PeriodWidgetSettings }) {
  const color = settings?.color || COLORS.WHITE;
  const sizes = TEXT_SIZES[isTextSize(settings?.size) ? settings.size : "md"];
  const label = data === undefined || data === null || String(data).trim() === "" ? EMPTY_VALUE : String(data);
  const cell = (key: keyof typeof sizes) => (
    <div className="w-full h-full flex items-center justify-center text-center px-1 overflow-hidden">
      <span className={`${sizes[key]} font-black italic tracking-tighter leading-tight break-words max-w-full`} style={{ color }}>{label}</span>
    </div>
  );
  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={{ "1x1": cell("1x1"), "2x1": cell("2x1"), "2x2": cell("2x2") }}/>
    </div>
  );
}

export function PeriodSettings({ settings, onChange }: { settings?: PeriodWidgetSettings; onChange: (s: PeriodWidgetSettings) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <ColorSwatchPicker colors={WIDGET_COLORS} value={settings?.color} onChange={(c) => onChange({ ...settings, color: c })} label={t.resume.wTextColor}/>
      <SegmentedPicker label={t.resume.wSize} value={settings?.size ?? "md"} options={sizeOptions(t.resume)} onChange={(size) => onChange({ ...settings, size })}/>
    </div>
  );
}
