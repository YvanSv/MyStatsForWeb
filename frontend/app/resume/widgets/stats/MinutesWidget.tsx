import { Timer } from "lucide-react";
import { StatWidget, StatSettings } from "./StatWidget";

interface MinutesWidgetProps {
  w: number;
  h: number;
  minutes: number;
  settings: any;
}

export function MinutesWidget({ w, h, minutes, settings }: MinutesWidgetProps) {
  return <StatWidget w={w} h={h} data={minutes} settings={settings} Icon={Timer} labelKey="labelMinutes" />;
}

export function MinutesSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  return <StatSettings settings={settings} onChange={onChange} Icon={Timer} labelKey="labelMinutes" extraColors={["#FBBF24", "#F87171"]} colorLabelKey="wAccentColor" rootClassName="mr-2" />;
}
