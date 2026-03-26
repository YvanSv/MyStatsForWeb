import Widget from "../Widget";
import { Disc } from "lucide-react";
import { CustomLabel, ShortenFilter, ShowIconFilter } from "./common_filters";
import { Layout1x1, Layout2x1, Layout2x2 } from "./common_layouts";

interface DistinctTracksProps {
  w: number;
  h: number;
  data: number;
  settings: any;
}

export function DistinctTracksWidget({ w, h, data, settings }: DistinctTracksProps) {
  const color = settings?.color || "#1DB954";

  const layouts = {
    "1x1": <Layout1x1 icon={<Disc size={14} style={{ color }} className="mb-1"/>} data={data} settings={settings}/>,
    "2x1": <Layout2x1 icon={<Disc size={24} className="opacity-20 text-white"/>} data={data} settings={settings}/>,
    "2x2": <Layout2x2 icon={<Disc size={36} className="opacity-20 text-white"/>} data={data} settings={settings}/>
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts} />
    </div>
  );
}

export function DistinctTracksSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Couleur</label>
        <div className="flex gap-2">
          {["#1DB954", "#FFFFFF", "#60A5FA", "#F472B6"].map(c => (
            <button key={c} onClick={() => update('color', c)}
              className={`w-6 h-6 rounded-full border-2 ${settings.color === c ? 'border-white' : 'border-transparent shadow-md'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Libellé personnalisé */}
      <CustomLabel update={update} settings={settings}/>

      {/* Options Binaires */}
      <div className="space-y-2">
        <ShowIconFilter update={update} settings={settings}/>
        <ShortenFilter update={update} settings={settings}/>
      </div>
    </div>
  );
}