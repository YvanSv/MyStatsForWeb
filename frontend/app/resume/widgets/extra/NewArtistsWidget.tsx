import { Sparkles } from "lucide-react";
import type { NewArtistsWidgetSettings } from "../../interfaces";
import { StatSettings, StatWidget } from "../stats/StatWidget";
import { finiteOrNull } from "../common";

export function NewArtistsWidget({ w, h, data, settings }: { w: number; h: number; data: number | null | undefined; settings?: NewArtistsWidgetSettings }) {
  return <StatWidget w={w} h={h} data={finiteOrNull(data) ?? 0} settings={settings} Icon={Sparkles} labelKey="labelNewArtists"/>;
}

export function NewArtistsSettings({ settings, onChange }: { settings?: NewArtistsWidgetSettings; onChange: (s: NewArtistsWidgetSettings) => void }) {
  return <StatSettings settings={settings} onChange={onChange} Icon={Sparkles} labelKey="labelNewArtists" extraColors={["#FBBF24", "#F87171"]} colorLabelKey="wAccentColor"/>;
}
