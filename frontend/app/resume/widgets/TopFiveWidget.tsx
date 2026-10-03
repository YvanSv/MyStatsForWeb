import type { ItemBrief, TopEntity, TopFiveWidgetSettings } from "../interfaces";
import Widget from "./Widget";
import { useLanguage } from "../../context/languageContext";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { SegmentedPicker } from "./SegmentedPicker";
import { COLORS } from "../../constants/ui";
import { WIDGET_COLORS, finiteOrNull } from "./common";
import { formatNumber } from "./stats/utils";

/** Les trois classements : le widget affiche celui du réglage `entity`. */
export type TopFiveData = Record<TopEntity, ItemBrief[]>;
const ENTITIES: TopEntity[] = ["tracks", "albums", "artists"];
export const isTopEntity = (v: unknown): v is TopEntity => ENTITIES.includes(v as TopEntity);

interface TopFiveProps {
  w: number;
  h: number;
  type: TopEntity;
  data: ItemBrief[];
  settings?: TopFiveWidgetSettings;
}

/** Pochette ronde (artistes) ou arrondie ; sans image, une pastille avec l'initiale du nom. */
export function Thumb({ item, round, className }: { item: ItemBrief; round: boolean; className: string }) {
  const shape = round ? "rounded-full" : "rounded-md";
  if (item.image) return <img src={item.image} alt="" className={`${className} ${shape} object-cover border border-white/10`}/>;
  return (
    <div aria-hidden="true" className={`${className} ${shape} bg-white/10 border border-white/10 flex items-center justify-center text-gray-500 font-black uppercase text-[8px]`}>
      {item.name?.trim().charAt(0)}
    </div>
  );
}

export function TopFiveWidget({ w, h, type, data, settings }: TopFiveProps) {
  const { t } = useLanguage();
  const color = settings?.color || COLORS.SPOTIFY_GREEN;
  const typeLabel = t.common[type];
  const round = type === "artists";
  const streamsText = (n?: number) => (finiteOrNull(n) === null ? null : `${formatNumber(n, false, t.common.locale)} ${t.common.streams}`);
  const items = Array.isArray(data) ? data.slice(0, 5) : [];
  // Sans élément, rien à afficher (les layouts lisent items[0])
  if (items.length === 0) return <div className="w-full h-full text1"/>;
  const first = items[0];

  const list = (
    <div className="w-full h-full p-1 flex flex-col">
      <p className="mb-0.5 border-b border-white/10 pb-0.5 text-[7px] uppercase tracking-[0.3em] italic text-center" style={{ color }}>
        {typeLabel}
      </p>
      <div className="flex-1 flex flex-col justify-between min-h-0">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-black italic text-white/30 leading-none w-3 shrink-0 text-center">{index + 1}</span>
            <Thumb item={item} round={round} className="w-6 h-6 shrink-0"/>
            <span className="flex-1 min-w-0 text-[8px] font-semibold text-white leading-tight truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Clés au format attendu par Widget (`${w}x${h}`)
  const layouts = {
    "1x1":
      <div className="w-full h-full flex flex-col items-center justify-between py-1">
        <p className="truncate max-w-[70px] text-[9px] text-white">{first.name}</p>
        <Thumb item={first} round={true} className="w-12 h-12"/>
      </div>,
    "2x1":
      <div className="flex justify-center h-full items-center gap-1">
        <div className="flex flex-col items-center justify-between h-[90%]">
          <p className="truncate max-w-[54px] text-[8px] text-white">{first.name}</p>
          <Thumb item={first} round={true} className="w-12 h-12"/>
        </div>
        <div className="flex flex-col border border-white/10 bg-white/5 rounded-xl w-[60%] justify-between h-full p-1">
          {items.slice(1, 4).map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-3 h-3 text-[5px] rounded-full bg-white/10 flex items-center justify-center text-gray-500 font-bold shrink-0">
                {i + 2}
              </div>
              <p className="flex-1 min-w-0 text-[6px] font-semibold text-white leading-tight truncate">{item.name}</p>
              <Thumb item={item} round={true} className="w-5 h-5 shrink-0"/>
            </div>
          ))}
        </div>
      </div>,
    "2x2": list,
    "3x2": list,
    "1x3": list,
    "3x3":
      <div className="w-full h-full bg-neutral-950 p-3 rounded-2xl flex flex-col border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Fond flou à partir de la pochette du n°1 */}
        {first.image && (
          <div className="absolute inset-0 opacity-20">
            <img src={first.image} className="w-full h-full object-cover scale-150 blur-3xl" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
          </div>
        )}

        {/* N°1 */}
        <div className="relative flex flex-col items-center justify-center text-center mt-3 mb-6 flex-1 z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] italic mb-4" style={{ color }}>
            {t.resume.wUnchallenged(typeLabel)}
          </p>
          <div className="relative mb-4">
            <Thumb item={first} round={round} className="w-32 h-32 border-4 text-4xl"/>
            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-black font-black italic text-xl shadow-xl" style={{ backgroundColor: color }}>
              1
            </div>
          </div>
          <div className="space-y-1 w-full px-4 overflow-hidden min-h-12">
            <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none truncate">{first.name}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-widest leading-none">{streamsText(first.streams)}</p>
          </div>
        </div>

        {/* Rangs 2 à 5 */}
        <div className="relative grid grid-cols-4 gap-2 z-10 border-t border-white/10 pt-4">
          {items.slice(1, 5).map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center gap-1 min-w-0">
              <span className="text-[10px] font-black italic text-white/30 leading-none">{index + 2}</span>
              <Thumb item={item} round={round} className="w-10 h-10"/>
              <div className="w-full overflow-hidden mt-0.5 px-0.5">
                <p className="text-[8px] font-bold text-white truncate uppercase tracking-tighter leading-none mb-0.5">{item.name}</p>
                <p className="text-[7px] text-gray-500 font-medium truncate uppercase tracking-tighter leading-none opacity-80">{streamsText(item.streams)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>,
  };

  return (
    <div className="w-full h-full text1">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}

export function TopFiveSettings({ settings, onChange }: { settings?: TopFiveWidgetSettings; onChange: (s: TopFiveWidgetSettings) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <SegmentedPicker label={t.resume.wEntity} value={isTopEntity(settings?.entity) ? settings.entity : "tracks"}
        options={[{ id: "tracks", label: t.resume.labelTracks }, { id: "albums", label: t.resume.labelAlbums }, { id: "artists", label: t.resume.labelArtists }]}
        onChange={(entity) => onChange({ ...settings, entity })}/>
      <ColorSwatchPicker colors={WIDGET_COLORS} value={settings?.color} onChange={(c) => onChange({ ...settings, color: c })} label={t.resume.wAccentColor} />
    </div>
  );
}
