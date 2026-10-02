import { Play } from "lucide-react";
import { StatWidget, StatSettings } from "./StatWidget";

interface StreamsWidgetProps {
  w: number;
  h: number;
  streams: number;
  settings: any;
}

export function StreamsWidget({ w, h, streams, settings }: StreamsWidgetProps) {
  return <StatWidget w={w} h={h} data={streams} settings={settings} Icon={Play} labelKey="labelStreams" />;
}

export function StreamsSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  return <StatSettings settings={settings} onChange={onChange} Icon={Play} labelKey="labelStreams" extraColors={["#38BDF8", "#A855F7"]} colorLabelKey="wAccentColor" />;
}
