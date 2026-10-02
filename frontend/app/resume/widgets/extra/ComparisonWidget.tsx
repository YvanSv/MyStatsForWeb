import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ComparisonMetric, ComparisonWidgetSettings } from "../../interfaces";
import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { SegmentedPicker } from "../SegmentedPicker";
import { CustomLabel, type StatUpdate } from "../stats/common_filters";
import { EMPTY_VALUE, finiteOrNull } from "../common";

export interface ComparisonData {
  minutes?: number | null;
  previous_minutes?: number | null;
  streams?: number | null;
  previous_streams?: number | null;
}

const UP = "#1DB954";
const DOWN = "#F87171";
const FLAT = "#9CA3AF";

/** Variation en % entre la période courante et la précédente ; null si la comparaison n'a pas de sens. */
export function variationPercent(current: unknown, previous: unknown): number | null {
  const c = finiteOrNull(current);
  const p = finiteOrNull(previous);
  if (c === null || p === null || p === 0) return null;
  return ((c - p) / p) * 100;
}

const isMetric = (v: unknown): v is ComparisonMetric => v === "minutes" || v === "streams";

export function ComparisonWidget({ w, h, data, settings }: { w: number; h: number; data: ComparisonData; settings?: ComparisonWidgetSettings }) {
  const { t } = useLanguage();
  const metric: ComparisonMetric = isMetric(settings?.metric) ? settings.metric : "minutes";
  const variation = metric === "streams"
    ? variationPercent(data?.streams, data?.previous_streams)
    : variationPercent(data?.minutes, data?.previous_minutes);
  const rounded = variation === null ? null : Math.round(variation);
  const label = settings?.label || (metric === "streams" ? t.resume.labelComparisonStreams : t.resume.labelComparisonMinutes);

  const color = rounded === null || rounded === 0 ? FLAT : rounded > 0 ? UP : DOWN;
  const Arrow = rounded === null || rounded === 0 ? Minus : rounded > 0 ? ArrowUp : ArrowDown;
  const text = rounded === null
    ? EMPTY_VALUE
    : new Intl.NumberFormat(t.common.locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(rounded / 100);
  const arrow = (size: number) => (rounded === null ? null : <Arrow size={size} style={{ color }} aria-hidden="true" data-testid="comparison-arrow"/>);

  const layouts = {
    "1x1":
      <div className="w-full h-full flex flex-col items-center justify-center">
        <span className="flex items-center gap-0.5 text-sm font-black tracking-tighter leading-none" style={{ color }}>{arrow(12)}{text}</span>
        <span className="text-[7px] uppercase font-bold text-gray-500 tracking-widest mt-1 text-center truncate max-w-full px-1">{label}</span>
      </div>,
    "2x1":
      <div className="w-full h-full flex items-center justify-between px-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] uppercase font-black text-gray-500 tracking-[0.2em] mb-1 truncate">{label}</span>
          <span className="text-xl font-black italic leading-none" style={{ color }}>{text}</span>
        </div>
        {arrow(24)}
      </div>,
    "2x2":
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        {arrow(36)}
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 my-2 italic text-center">{label}</span>
        <span className="text-4xl font-black italic tracking-tighter leading-none" style={{ color }}>{text}</span>
      </div>,
  };
  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}

export function ComparisonSettings({ settings, onChange }: { settings?: ComparisonWidgetSettings; onChange: (s: ComparisonWidgetSettings) => void }) {
  const { t } = useLanguage();
  const metric: ComparisonMetric = isMetric(settings?.metric) ? settings.metric : "minutes";
  const update: StatUpdate = (key, value) => onChange({ ...settings, [key]: value });
  return (
    <div className="space-y-6">
      <SegmentedPicker label={t.resume.wMetric} value={metric} onChange={(m) => onChange({ ...settings, metric: m })}
        options={[{ id: "minutes", label: t.resume.labelMinutes }, { id: "streams", label: t.resume.labelStreams }]}/>
      <CustomLabel update={update} settings={settings} defaultLabel={metric === "streams" ? t.resume.labelComparisonStreams : t.resume.labelComparisonMinutes}/>
    </div>
  );
}
