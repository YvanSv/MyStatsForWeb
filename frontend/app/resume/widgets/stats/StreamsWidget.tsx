import Widget from "../Widget";
import { Play } from "lucide-react";
import { CustomLabel, ShortenFilter, ShowIconFilter } from "./common_filters";
import { Layout1x1, Layout2x1, Layout2x2 } from "./common_layouts";

interface StreamsWidgetProps {
  w: number;
  h: number;
  streams: number;
  settings: any;
}

export function StreamsWidget({ w, h, streams, settings }: StreamsWidgetProps) {
  const color = settings?.color || "#1DB954";

  const layouts = {
    "1x1": <Layout1x1 data={streams} settings={settings} icon={<Play size={14} style={{ color }} className="mb-1"/>}/>,
    "2x1": <Layout2x1 data={streams} settings={settings} icon={<Play size={24} className="opacity-20 text-white"/>}/>,
    "2x2": <Layout2x2 data={streams} settings={settings} icon={<Play size={36} className="opacity-20 text-white"/>}/>
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts} />
    </div>
  );
}

export function StreamsSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-6">
      {/* Couleur */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Couleur accentuée</label>
        <div className="flex gap-2">
          {["#1DB954", "#FFFFFF", "#38BDF8", "#A855F7"].map(c => (
            <button key={c} type="button" aria-label={c} aria-pressed={settings?.color === c} onClick={() => update('color', c)}
              className={`w-6 h-6 rounded-full border-2 ${settings?.color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Libellé personnalisé */}
      <CustomLabel update={update} settings={settings}/>

      {/* Options */}
      <div className="space-y-2">
        <ShowIconFilter update={update} settings={settings}/>
        <ShortenFilter update={update} settings={settings}/>
      </div>
    </div>
  );
}