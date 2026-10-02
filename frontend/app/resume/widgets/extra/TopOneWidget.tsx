import type { ItemBrief, TopEntity, TopOneWidgetSettings } from "../../interfaces";
import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { ColorSwatchPicker } from "../ColorSwatchPicker";
import { SegmentedPicker } from "../SegmentedPicker";
import { Thumb } from "../TopFiveWidget";
import { COLORS } from "../../../constants/ui";
import { EMPTY_VALUE, WIDGET_COLORS, finiteOrNull } from "../common";
import { formatNumber } from "../stats/utils";

/** Premier élément de chaque classement (absent si le classement est vide). */
export type TopOneData = Partial<Record<TopEntity, ItemBrief | undefined>>;

const ENTITIES: TopEntity[] = ["tracks", "albums", "artists"];
const isEntity = (v: unknown): v is TopEntity => ENTITIES.includes(v as TopEntity);

export function TopOneWidget({ w, h, data, settings }: { w: number; h: number; data: TopOneData; settings?: TopOneWidgetSettings }) {
  const { t } = useLanguage();
  const entity: TopEntity = isEntity(settings?.entity) ? settings.entity : "tracks";
  const color = settings?.color || COLORS.SPOTIFY_GREEN;
  const heading = { tracks: t.resume.topTrack, albums: t.resume.topAlbum, artists: t.resume.topArtist }[entity];
  const item = data?.[entity];

  if (!item) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center">
        <span className="text-[7px] uppercase font-bold text-gray-500 tracking-widest">{heading}</span>
        <span className="text-sm font-black text-white/40">{EMPTY_VALUE}</span>
      </div>
    );
  }

  const round = entity === "artists";
  const streams = finiteOrNull(item.streams) === null ? null : `${formatNumber(item.streams, false, t.common.locale)} ${t.common.streams}`;
  const headingEl = (cls: string) => <span className={`${cls} uppercase font-black tracking-widest italic truncate`} style={{ color }}>{heading}</span>;
  const streamsEl = (cls: string) => streams && <span className={`${cls} text-gray-400 font-bold uppercase truncate`}>{streams}</span>;

  const layouts = {
    "1x1":
      <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1 min-w-0">
        <Thumb item={item} round={round} className="w-10 h-10 shrink-0"/>
        <span className="w-full text-center text-[8px] font-black text-white truncate">{item.name}</span>
        {streamsEl("text-[6px]")}
      </div>,
    "2x1":
      <div className="w-full h-full flex items-center gap-2 px-2 min-w-0">
        <Thumb item={item} round={round} className="w-12 h-12 shrink-0"/>
        <div className="flex flex-col min-w-0 flex-1">
          {headingEl("text-[7px]")}
          <span className="text-sm font-black text-white leading-tight truncate">{item.name}</span>
          {streamsEl("text-[8px]")}
        </div>
      </div>,
    "2x2":
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center min-w-0">
        {headingEl("text-[9px] max-w-full")}
        <Thumb item={item} round={round} className="w-20 h-20 shrink-0 border-2 text-2xl"/>
        <span className="w-full text-lg font-black text-white leading-tight truncate">{item.name}</span>
        {streamsEl("text-[9px] max-w-full")}
      </div>,
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}

export function TopOneSettings({ settings, onChange }: { settings?: TopOneWidgetSettings; onChange: (s: TopOneWidgetSettings) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <SegmentedPicker label={t.resume.wEntity} value={isEntity(settings?.entity) ? settings.entity : "tracks"}
        options={[{ id: "tracks", label: t.resume.labelTracks }, { id: "albums", label: t.resume.labelAlbums }, { id: "artists", label: t.resume.labelArtists }]}
        onChange={(entity) => onChange({ ...settings, entity })}/>
      <ColorSwatchPicker colors={WIDGET_COLORS} value={settings?.color} onChange={(c) => onChange({ ...settings, color: c })} label={t.resume.wAccentColor}/>
    </div>
  );
}
