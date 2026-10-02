import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { useLanguage } from "../../../context/languageContext";
import Widget from "../Widget";
import { ColorSwatchPicker } from "../ColorSwatchPicker";
import { CustomLabel, ShortenFilter, ShowIconFilter } from "./common_filters";
import { Layout1x1, Layout2x1, Layout2x2 } from "./common_layouts";
import { COLORS } from "../../../constants/ui";

export type StatLabelKey = "labelStreams" | "labelMinutes" | "labelAlbums" | "labelArtists" | "labelTracks";

interface StatConfig {
  Icon: ComponentType<LucideProps>;
  labelKey: StatLabelKey;
}

interface StatSettingsConfig extends StatConfig {
  /** Palette de couleurs proposées (après vert Spotify et blanc). */
  extraColors: [string, string];
  colorLabelKey: "wAccentColor" | "wColor";
  /** Ombre sur les pastilles non sélectionnées. */
  swatchShadow?: boolean;
  /** Classe additionnelle sur le conteneur des réglages. */
  rootClassName?: string;
}

interface StatWidgetProps extends StatConfig {
  w: number;
  h: number;
  data: number;
  settings: any;
}

export function StatWidget({ w, h, data, settings, Icon, labelKey }: StatWidgetProps) {
  const { t } = useLanguage();
  const defaultLabel = t.resume[labelKey];
  const color = settings?.color || COLORS.SPOTIFY_GREEN;

  const layouts = {
    "1x1": <Layout1x1 icon={<Icon size={14} style={{ color }} className="mb-1"/>} data={data} settings={settings} defaultLabel={defaultLabel}/>,
    "2x1": <Layout2x1 icon={<Icon size={24} className="opacity-20 text-white"/>} data={data} settings={settings} defaultLabel={defaultLabel}/>,
    "2x2": <Layout2x2 icon={<Icon size={36} className="opacity-20 text-white"/>} data={data} settings={settings} defaultLabel={defaultLabel}/>
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts} />
    </div>
  );
}

export function StatSettings({ settings, onChange, labelKey, extraColors, colorLabelKey, swatchShadow, rootClassName }: StatSettingsConfig & { settings: any, onChange: (s: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...settings, [key]: value });
  const { t } = useLanguage();
  const defaultLabel = t.resume[labelKey];

  return (
    <div className={rootClassName ? `space-y-6 ${rootClassName}` : "space-y-6"}>
      <ColorSwatchPicker
        colors={[COLORS.SPOTIFY_GREEN, COLORS.WHITE, ...extraColors]}
        value={settings?.color}
        onChange={(c) => update('color', c)}
        label={t.resume[colorLabelKey]}
        shadow={swatchShadow}
      />

      <CustomLabel update={update} settings={settings} defaultLabel={defaultLabel}/>

      <div className="space-y-2">
        <ShowIconFilter update={update} settings={settings}/>
        <ShortenFilter update={update} settings={settings}/>
      </div>
    </div>
  );
}
