import { DiscAlbum } from "lucide-react";
import { StatWidget, StatSettings } from "./StatWidget";

interface DistinctAlbumsProps {
  w: number;
  h: number;
  data: number;
  settings: any;
}

export function DistinctAlbumsWidget({ w, h, data, settings }: DistinctAlbumsProps) {
  return <StatWidget w={w} h={h} data={data} settings={settings} Icon={DiscAlbum} labelKey="labelAlbums" />;
}

export function DistinctAlbumsSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  return <StatSettings settings={settings} onChange={onChange} Icon={DiscAlbum} labelKey="labelAlbums" extraColors={["#60A5FA", "#F472B6"]} colorLabelKey="wColor" swatchShadow />;
}
