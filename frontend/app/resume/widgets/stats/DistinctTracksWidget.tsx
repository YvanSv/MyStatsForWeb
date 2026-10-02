import { Disc } from "lucide-react";
import { StatWidget, StatSettings } from "./StatWidget";

interface DistinctTracksProps {
  w: number;
  h: number;
  data: number;
  settings: any;
}

export function DistinctTracksWidget({ w, h, data, settings }: DistinctTracksProps) {
  return <StatWidget w={w} h={h} data={data} settings={settings} Icon={Disc} labelKey="labelTracks" />;
}

export function DistinctTracksSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  return <StatSettings settings={settings} onChange={onChange} Icon={Disc} labelKey="labelTracks" extraColors={["#60A5FA", "#F472B6"]} colorLabelKey="wColor" swatchShadow />;
}
