/**
 * REGISTRE DES WIDGETS : chaque type de widget est décrit ici, une seule fois.
 * Pour ajouter un widget (ex. « top_artists ») :
 *  1. Écrire widgets/.../MonWidget.tsx : le composant d'affichage ({w,h,data,settings}) et son composant de réglages ({settings,onChange}).
 *  2. interfaces.ts : ajouter son interface de réglages et l'entrée dans WidgetSettingsMap (le compilateur exige alors l'étape 4).
 *  3. Locales fr.ts ET en.ts (mêmes clés) : libellé (labelKey) et sous-titre (subtitleKey) dans `resume`.
 *  4. Ajouter UNE entrée dans WIDGET_REGISTRY ci-dessous (défini avec defineWidget) : category, icon, defaultSize, Component, Settings, select.
 *  5. Rien d'autre : WIDGET_TYPES, le canvas, le panneau de réglages et la liste « Widgets » en sont dérivés ; widgetRegistry.test.tsx vérifie la cohérence.
 * Ne jamais renommer un id de type existant (il est persisté dans le localStorage).
 * `select` extrait du résumé les données du widget ; si elles manquent dans ResumeData, étendre ResumeData (interfaces.ts).
 */
import type { ComponentType } from "react";
import type { fr } from "../constants/locales/fr";
import type { AnyWidgetSettings, ResumeData, UserProfile, WidgetSettingsMap, WidgetType } from "./interfaces";
import { ProfilePictureSettings, ProfilePictureWidget } from "./widgets/atomic/ProfilePictureWidget";
import { UsernameSettings, UsernameWidget } from "./widgets/atomic/UsernameWidget";
import { BackgroundSettings, BackgroundWidget } from "./widgets/atomic/BackgroundWidget";
import { BioSettings, BioWidget } from "./widgets/atomic/BioWidget";
import { MinutesSettings, MinutesWidget } from "./widgets/stats/MinutesWidget";
import { StreamsSettings, StreamsWidget } from "./widgets/stats/StreamsWidget";
import { DistinctTracksSettings, DistinctTracksWidget } from "./widgets/stats/DistinctTracksWidget";
import { DistinctAlbumsSettings, DistinctAlbumsWidget } from "./widgets/stats/DistinctAlbumsWidget";
import { DistinctArtistsSettings, DistinctArtistsWidget } from "./widgets/stats/DistinctArtistsWidget";

export type WidgetCategory = "account" | "stats";
/** Ordre d'affichage des catégories dans la liste « Widgets » et clé de leur titre (t.resume). */
export const WIDGET_CATEGORIES: { id: WidgetCategory; titleKey: ResumeKey }[] = [
  { id: "account", titleKey: "sectionAccount" },
  { id: "stats", titleKey: "sectionStats" },
];

type ResumeDict = typeof fr.resume;
/** Clés de t.resume dont la valeur est un texte simple (pas une fonction). */
type ResumeKey = { [K in keyof ResumeDict]: ResumeDict[K] extends string ? K : never }[keyof ResumeDict];

export interface WidgetSubtitleContext {
  r: ResumeDict;
  /** Formate un nombre selon la langue courante. */
  n: (v: number) => string;
}

export interface WidgetComponentProps<K extends WidgetType, D> {
  w: number;
  h: number;
  settings?: WidgetSettingsMap[K];
  data: D;
}
export interface WidgetSettingsProps<K extends WidgetType> {
  settings?: WidgetSettingsMap[K];
  onChange: (s: WidgetSettingsMap[K]) => void;
}

export interface WidgetDefinition<K extends WidgetType, D> {
  type: K;
  category: WidgetCategory;
  /** Clé de t.resume du libellé du widget. */
  labelKey: ResumeKey;
  /** Sous-titre de la carte : texte fixe (clé de t.resume) ou calculé à partir des données. */
  subtitle: ResumeKey | ((data: D, ctx: WidgetSubtitleContext) => string | undefined);
  icon: string;
  defaultSettings: WidgetSettingsMap[K];
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  Component: ComponentType<WidgetComponentProps<K, D>>;
  /** Composant de réglages, ou null si le widget n'en a pas. */
  Settings: ComponentType<WidgetSettingsProps<K>> | null;
  /** Données du widget extraites du résumé. */
  select: (resume: ResumeData) => D;
}

/** Définition à données effacées, utilisable sans connaître le type de données de chaque widget. */
export type AnyWidgetDefinition<K extends WidgetType = WidgetType> = WidgetDefinition<K, unknown>;

const defineWidget = <K extends WidgetType, D>(def: WidgetDefinition<K, D>): AnyWidgetDefinition<K> =>
  def as unknown as AnyWidgetDefinition<K>;

const stat = (n: (v: number) => string, v: number, unit: string) => `${n(v)} ${unit}`;

/** Typage mappé : toute entrée de WidgetSettingsMap doit avoir sa définition ici (et inversement). */
export const WIDGET_REGISTRY: { [K in WidgetType]: AnyWidgetDefinition<K> } = {
  profile_picture: defineWidget<"profile_picture", UserProfile>({
    type: "profile_picture", category: "account", labelKey: "widgetProfilePicture", subtitle: "subtitleAvatar", icon: "👤",
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <ProfilePictureWidget w={w} h={h} user={data} settings={settings} />,
    Settings: ProfilePictureSettings,
    select: (d) => d.user,
  }),
  username: defineWidget<"username", string>({
    type: "username", category: "account", labelKey: "widgetUsername", subtitle: "subtitleUsername", icon: "🖋️",
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <UsernameWidget w={w} h={h} data={data} settings={settings} />,
    Settings: UsernameSettings,
    select: (d) => d.user?.display_name,
  }),
  background: defineWidget<"background", string>({
    type: "background", category: "account", labelKey: "widgetBackground", subtitle: "subtitleBanner", icon: "🖼️",
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <BackgroundWidget w={w} h={h} data={data} settings={settings} />,
    Settings: BackgroundSettings,
    select: (d) => d.user?.banner,
  }),
  bio: defineWidget<"bio", string>({
    type: "bio", category: "account", labelKey: "widgetBio", subtitle: "subtitleBio", icon: "📝",
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <BioWidget w={w} h={h} bio={data} settings={settings} />,
    Settings: BioSettings,
    select: (d) => d.user?.bio,
  }),
  minutes: defineWidget<"minutes", number>({
    type: "minutes", category: "stats", labelKey: "totalTime", icon: "⏳",
    subtitle: (v, { r, n }) => stat(n, v, r.unitMinutes),
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <MinutesWidget w={w} h={h} minutes={data} settings={settings} />,
    Settings: MinutesSettings,
    select: (d) => d.minutes,
  }),
  streams: defineWidget<"streams", number>({
    type: "streams", category: "stats", labelKey: "totalStreams", icon: "▶️",
    subtitle: (v, { r, n }) => stat(n, v, r.unitStreams),
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <StreamsWidget w={w} h={h} streams={data} settings={settings} />,
    Settings: StreamsSettings,
    select: (d) => d.streams,
  }),
  nb_tracks: defineWidget<"nb_tracks", number>({
    type: "nb_tracks", category: "stats", labelKey: "widgetTracks", icon: "💿",
    subtitle: (v, { r, n }) => stat(n, v, r.unitTracks),
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <DistinctTracksWidget w={w} h={h} data={data} settings={settings} />,
    Settings: DistinctTracksSettings,
    select: (d) => d.distinct_tracks,
  }),
  nb_albums: defineWidget<"nb_albums", number>({
    type: "nb_albums", category: "stats", labelKey: "widgetAlbums", icon: "💽",
    subtitle: (v, { r, n }) => stat(n, v, r.unitAlbums),
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <DistinctAlbumsWidget w={w} h={h} data={data} settings={settings} />,
    Settings: DistinctAlbumsSettings,
    select: (d) => d.distinct_albums,
  }),
  nb_artists: defineWidget<"nb_artists", number>({
    type: "nb_artists", category: "stats", labelKey: "widgetArtists", icon: "🎤",
    subtitle: (v, { r, n }) => stat(n, v, r.unitArtists),
    defaultSettings: {}, defaultSize: { w: 1, h: 1 },
    Component: ({ w, h, data, settings }) => <DistinctArtistsWidget w={w} h={h} data={data} settings={settings} />,
    Settings: DistinctArtistsSettings,
    select: (d) => d.distinct_artists,
  }),
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY) as WidgetType[];

export const isWidgetType = (type: unknown): type is WidgetType =>
  typeof type === "string" && Object.prototype.hasOwnProperty.call(WIDGET_REGISTRY, type);

/** Définition d'un type de widget (à données effacées : la corrélation type/réglages est garantie par le registre). */
export const getWidgetDefinition = (type: WidgetType): AnyWidgetDefinition<WidgetType> =>
  WIDGET_REGISTRY[type] as AnyWidgetDefinition<WidgetType>;

export const widgetsOfCategory = (category: WidgetCategory): AnyWidgetDefinition<WidgetType>[] =>
  WIDGET_TYPES.filter((t) => WIDGET_REGISTRY[t].category === category).map(getWidgetDefinition);

/** Réglages d'un widget : le composant reçoit ceux de son type (garanti par le registre). */
export type AnySettingsProps = { settings?: AnyWidgetSettings; onChange: (s: AnyWidgetSettings) => void };
