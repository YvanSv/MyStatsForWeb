import Widget from "../Widget";
import { Timer } from "lucide-react";
import { CustomLabel, ShortenFilter, ShowIconFilter } from "./common_filters";
import { Layout1x1, Layout2x1, Layout2x2 } from "./common_layouts";

interface MinutesWidgetProps {
  w: number;
  h: number;
  minutes: number;
  settings: any;
}

export function MinutesWidget({ w, h, minutes, settings }: MinutesWidgetProps) {
  const color = settings?.color || "#1DB954";

  const layouts = {
    "1x1": <Layout1x1 icon={<Timer size={14} style={{ color }} className="mb-1"/>} data={minutes} settings={settings}/>,
    "2x1": <Layout2x1 icon={<Timer size={24} className="opacity-20 text-white" />} data={minutes} settings={settings}/>,
    "2x2": <Layout2x2 data={minutes} settings={settings} icon={<Timer size={36} className="opacity-20 text-white"/>}/>
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts} />
    </div>
  );
}

export function MinutesSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-6 mr-2">
      {/* Couleur du compteur */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Couleur accentuée</label>
        <div className="flex gap-2">
          {["#1DB954", "#FFFFFF", "#FBBF24", "#F87171"].map(c => (
            <button key={c} onClick={() => update('color', c)}
              className={`w-6 h-6 rounded-full border-2 ${settings.color === c ? 'border-white' : 'border-transparent'}`}
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