import { MicVocal } from "lucide-react";
import type { DistinctArtistsWidgetSettings } from "../../interfaces";
import { StatWidget, StatSettings } from "./StatWidget";

interface DistinctArtistsProps {
  w: number;
  h: number;
  data: number;
  settings?: DistinctArtistsWidgetSettings;
}

export function DistinctArtistsWidget({ w, h, data, settings }: DistinctArtistsProps) {
  return <StatWidget w={w} h={h} data={data} settings={settings} Icon={MicVocal} labelKey="labelArtists" />;
}

export function DistinctArtistsSettings({ settings, onChange }: { settings?: DistinctArtistsWidgetSettings, onChange: (s: DistinctArtistsWidgetSettings) => void }) {
  return <StatSettings settings={settings} onChange={onChange} Icon={MicVocal} labelKey="labelArtists" extraColors={["#60A5FA", "#F472B6"]} colorLabelKey="wColor" swatchShadow />;
}
