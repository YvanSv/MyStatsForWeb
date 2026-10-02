import { Flame } from "lucide-react";
import type { StreakWidgetSettings } from "../../interfaces";
import { useLanguage } from "../../../context/languageContext";
import { StatSettings, StatWidget } from "../stats/StatWidget";
import { finiteOrNull } from "../common";

export interface StreakData {
  longest_streak_days?: number | null;
  current_streak_days?: number | null;
}

export function StreakWidget({ w, h, data, settings }: { w: number; h: number; data: StreakData; settings?: StreakWidgetSettings }) {
  const current = !!settings?.showCurrent;
  const value = finiteOrNull(current ? data?.current_streak_days : data?.longest_streak_days) ?? 0;
  return <StatWidget w={w} h={h} data={value} settings={settings} Icon={Flame} labelKey={current ? "labelStreakCurrent" : "labelStreak"}/>;
}

export function StreakSettings({ settings, onChange }: { settings?: StreakWidgetSettings; onChange: (s: StreakWidgetSettings) => void }) {
  const { t } = useLanguage();
  const current = !!settings?.showCurrent;
  return (
    <div className="space-y-6">
      <StatSettings settings={settings} onChange={(s) => onChange({ ...settings, ...s })} Icon={Flame}
        labelKey={current ? "labelStreakCurrent" : "labelStreak"} extraColors={["#FBBF24", "#F87171"]} colorLabelKey="wAccentColor"/>
      <button type="button" aria-pressed={current} onClick={() => onChange({ ...settings, showCurrent: !current })}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold">
        {t.resume.wShowCurrentStreak}
        <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${current ? "bg-vert" : "bg-white/20"}`}>
          <div className={`w-3 h-3 bg-white rounded-full transition-all ${current ? "translate-x-3" : "translate-x-0"}`} />
        </div>
      </button>
    </div>
  );
}
