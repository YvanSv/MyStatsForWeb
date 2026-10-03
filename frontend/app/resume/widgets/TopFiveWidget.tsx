import type { ItemBrief, SortOption, TopEntity, TopFiveWidgetSettings } from "../interfaces";
import Widget from "./Widget";
import { useLanguage } from "../../context/languageContext";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { SegmentedPicker } from "./SegmentedPicker";
import { COLORS } from "../../constants/ui";
import { WIDGET_COLORS, finiteOrNull } from "./common";
import { formatNumber } from "./stats/utils";
import { formatMinutes, ratingColorClass } from "../../components/rankings/format";

/** Les trois classements : le widget affiche celui du réglage `entity`. */
export type TopFiveData = Record<TopEntity, ItemBrief[]> & { bySort?: Partial<Record<TopEntity, Partial<Record<SortOption, ItemBrief[]>>>> };
const SORTS: SortOption[] = ["streams", "minutes", "rating"];
export const isSortOption = (v: unknown): v is SortOption => SORTS.includes(v as SortOption);

/**
 * Liste à afficher pour un élément et un tri. Repli sans `tops_by_sort` (ancien backend) :
 * « streams » prend les topX existants (déjà triés par streams) ; « minutes » et « rating »
 * donnent une liste vide (état vide) : retrier les 5 premiers par streams afficherait un
 * faux classement, puisque le vrai n°1 en minutes ou en note peut ne pas y figurer.
 */
export function pickTopFive(data: TopFiveData, entity: TopEntity, sort: SortOption): ItemBrief[] {
  const sorted = data.bySort?.[entity]?.[sort];
  if (Array.isArray(sorted) && sorted.length > 0) return sorted;
  return sort === "streams" ? data[entity] : [];
}
const ENTITIES: TopEntity[] = ["tracks", "albums", "artists"];
export const isTopEntity = (v: unknown): v is TopEntity => ENTITIES.includes(v as TopEntity);

interface TopFiveProps {
  w: number;
  h: number;
  type: TopEntity;
  data: ItemBrief[];
  /** Critère de classement (défaut : streams), affiché en pastille et en valeur par élément. */
  sort?: SortOption;
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

export function TopFiveWidget({ w, h, type, data, sort = "streams", settings }: TopFiveProps) {
  const { t } = useLanguage();
  const color = settings?.color || COLORS.SPOTIFY_GREEN;
  const typeLabel = t.common[type];
  const round = type === "artists";
  // Libellé court du critère actif (dictionnaires existants)
  const label = sort === "minutes" ? t.resume.wListeningTime : sort === "rating" ? t.ranking.sortOptions.rating : t.ranking.sortOptions.play_count;
  /**
   * Valeur de l'élément selon le tri, ou null si absente/invalide (affichée « – »).
   * `short` : nombres abrégés (k/M) pour les petites cases. Streams sans unité ; minutes avec « min » seulement si `short` est faux (sinon l'unité est dans l'étiquette).
   */
  const criterion = (item: ItemBrief, short = false) => {
    const loc = t.common.locale;
    if (sort === "rating") return finiteOrNull(item.rating) === null ? null : { text: item.rating.toFixed(2), cls: ratingColorClass(item.rating) };
    const raw = finiteOrNull(sort === "minutes" ? item.minutes : item.streams);
    if (raw === null) return null;
    const num = sort === "minutes" ? (short ? formatNumber(Math.round(raw), true, loc) : formatMinutes(raw, loc)) : formatNumber(raw, short, loc);
    // Streams : valeur seule. Minutes : « min » collée à la valeur seulement dans les layouts larges ;
    // en étroit (short) l'unité passe dans l'étiquette du critère (« Temps d'écoute (min) ») pour ne jamais tronquer la valeur.
    return { text: sort === "minutes" && !short ? `${num} ${t.resume.unitMinutes}` : num, cls: "" };
  };
  /** Valeur alignée à droite (chiffres tabulaires), « – » quand elle manque. Jamais tronquée : prioritaire (shrink-0), c'est le nom qui se tronque. */
  const value = (item: ItemBrief, short: boolean, size: string, base = "text-gray-400") => {
    const c = criterion(item, short);
    return <span className={`shrink-0 whitespace-nowrap text-right tabular-nums font-semibold leading-tight ${size} ${c?.cls || base}`}>{c ? c.text : "–"}</span>;
  };
  /** Pastille du critère actif. */
  const pill = (size: string, short = false, full = false) => (
    <span className={`${full ? "whitespace-nowrap" : "truncate max-w-full"} uppercase tracking-wider text-gray-400 leading-none ${size}`}>{short && sort === "minutes" ? `${label} (${t.resume.unitMinutes})` : label}</span>
  );
  const items = Array.isArray(data) ? data.slice(0, 5) : [];
  // Sans élément, rien à afficher (les layouts lisent items[0])
  if (items.length === 0) return <div className="w-full h-full text1"/>;
  const first = items[0];

  // Liste 2x2 / 1x3 (étroite : nombres abrégés) et 3x2 (large : nombres complets), valeur à droite de chaque nom
  const makeList = (short: boolean, full = false) => (
    <div className="w-full h-full p-1 flex flex-col">
      {/* En-tête en 3 zones : espaceur, titre centré, critère à droite */}
      <div className="mb-0.5 border-b border-white/10 pb-0.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] items-center gap-1 min-w-0">
        <span aria-hidden="true"/>
        <p className="text-[7px] uppercase tracking-[0.3em] italic text-center truncate max-w-full" style={{ color }}>{typeLabel}</p>
        <span className={`justify-self-end flex ${full ? "" : "min-w-0 max-w-full"}`}>{pill("text-[6px]", short, full)}</span>
      </div>
      <div className="flex-1 flex flex-col justify-between min-h-0">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-black italic text-white/30 leading-none w-3 shrink-0 text-center">{index + 1}</span>
            <Thumb item={item} round={round} className="w-6 h-6 shrink-0"/>
            <span className="flex-1 min-w-0 text-[8px] font-semibold text-white leading-tight truncate">{item.name}</span>
            {value(item, short, "text-[7px]")}
          </div>
        ))}
      </div>
    </div>
  );
  // 2x2 et 3x2 : pastille jamais tronquée ; 1x3 (très étroit) : tronquée si besoin
  const narrow = makeList(true, true);
  const wide = makeList(false, true);

  /** N°1 en grand puis les rangs 2 à 5 ; `twoRows` : rangs 2 à 5 sur deux lignes (format 3x5). */
  const bigLayout = (twoRows: boolean) => (
      <div className="w-full h-full bg-neutral-950 p-3 rounded-2xl flex flex-col border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Fond flou à partir de la pochette du n°1 */}
        {first.image && (
          <div className="absolute inset-0 opacity-20">
            <img src={first.image} className="w-full h-full object-cover scale-150 blur-3xl" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
          </div>
        )}

        {/* N°1 */}
        <div className="relative flex flex-col items-center justify-center text-center mt-1 mb-3 flex-1 min-h-0 z-10">
          {/* Titre centré, critère à droite sur la même ligne */}
          <div className="w-full grid grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] items-center gap-2 mb-3 min-w-0">
            <span aria-hidden="true"/>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] italic text-center truncate max-w-full" style={{ color }}>
              {typeLabel}
            </p>
            <span className="justify-self-end flex px-2 py-0.5 rounded-full border border-white/10 bg-white/5">{pill("text-[8px]", false, true)}</span>
          </div>
          <div className="relative mb-4 shrink-0">
            <Thumb item={first} round={round} className="w-28 h-28 border-4 text-4xl"/>
            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-black font-black italic text-xl shadow-xl" style={{ backgroundColor: color }}>
              1
            </div>
          </div>
          <div className="space-y-1 w-full min-w-0 px-4 overflow-hidden min-h-12">
            <h3 className="text-xl font-black uppercase text-white tracking-tight line-clamp-2 break-words text-center leading-tight min-w-0">{first.name}</h3>
            <p className={`text-[10px] font-bold uppercase truncate tracking-widest leading-none tabular-nums ${criterion(first)?.cls || "text-gray-400"}`}>{criterion(first)?.text ?? "–"}</p>
          </div>
        </div>

        {/* Rangs 2 à 5 : une ligne de quatre (3x3 et 3x4), ou deux lignes de deux en 3x5 (plus de hauteur) */}
        {twoRows ? (
          <div className="relative grid grid-cols-2 gap-x-3 gap-y-2 z-10 border-t border-white/10 pt-3">
            {items.slice(1, 5).map((item, index) => (
              <div key={index} className="flex items-center gap-2 min-w-0">
                <span className="w-3 shrink-0 text-center text-[10px] font-black italic text-white/30 leading-none">{index + 2}</span>
                <Thumb item={item} round={round} className="w-9 h-9 shrink-0"/>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[9px] font-bold text-white truncate uppercase tracking-tighter leading-tight">{item.name}</p>
                  <p className={`text-[8px] font-medium truncate uppercase tracking-tighter leading-none opacity-80 tabular-nums ${criterion(item)?.cls || "text-gray-500"}`}>{criterion(item)?.text ?? "–"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative grid grid-cols-4 gap-2 z-10 border-t border-white/10 pt-4">
            {items.slice(1, 5).map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center gap-1 min-w-0">
                <span className="text-[10px] font-black italic text-white/30 leading-none">{index + 2}</span>
                <Thumb item={item} round={round} className="w-10 h-10"/>
                <div className="w-full overflow-hidden mt-0.5 px-0.5">
                  <p className="text-[8px] font-bold text-white truncate uppercase tracking-tighter leading-none mb-0.5">{item.name}</p>
                  <p className={`text-[7px] font-medium truncate uppercase tracking-tighter leading-none opacity-80 tabular-nums ${criterion(item)?.cls || "text-gray-500"}`}>{criterion(item)?.text ?? "–"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );

  // Clés au format attendu par Widget (`${w}x${h}`)
  const layouts = {
    "1x1":
      <div className="w-full h-full flex flex-col items-center justify-between py-1">
        <p className="truncate max-w-[70px] text-[9px] text-white leading-none">{first.name}</p>
        <Thumb item={first} round={true} className="w-10 h-10"/>
        {/* Valeur seule (abrégée, sans unité) + critère en texte minuscule : tient dans 70px */}
        <div className="flex flex-col items-center max-w-[70px] gap-0.5 min-w-0">
          {value(first, true, "text-[10px]", "text-white")}
          {pill("text-[5px]", true)}
        </div>
      </div>,
    "2x1":
      <div className="flex justify-center h-full items-center gap-1">
        <div className="flex flex-col items-center justify-between h-[90%]">
          <p className="truncate min-w-0 max-w-[54px] text-[8px] text-white leading-none">{first.name}</p>
          <Thumb item={first} round={true} className="w-10 h-10"/>
          {value(first, true, "text-[8px]", "text-white")}
        </div>
        <div className="flex flex-col border border-white/10 bg-white/5 rounded-xl w-[60%] justify-between h-full p-1">
          {/* En-tête en 5px : titre aligné à gauche, critère à droite (tronqué si besoin) */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-0.5 border-b border-white/10 pb-px min-w-0">
            <p className="text-[5px] uppercase tracking-widest italic text-left truncate max-w-full leading-none" style={{ color }}>{typeLabel}</p>
            <span className="justify-self-end min-w-0 max-w-full flex">{pill("text-[5px]", true)}</span>
          </div>
          {items.slice(1, 4).map((item, i) => (
            <div key={i} className="flex items-center gap-1 min-w-0">
              <div className="w-3 h-3 text-[5px] rounded-full bg-white/10 flex items-center justify-center text-gray-500 font-bold shrink-0">
                {i + 2}
              </div>
              <p className="flex-1 min-w-0 text-[6px] font-semibold text-white leading-tight truncate">{item.name}</p>
              {value(item, true, "text-[5px]")}
              <Thumb item={item} round={true} className="w-4 h-4 shrink-0"/>
            </div>
          ))}
        </div>
      </div>,
    // 1 colonne x 2 lignes : liste compacte de 3 éléments, titre à gauche, critère dessous (aligné à gauche)
    "1x2":
      <div className="w-full h-full p-1 flex flex-col min-w-0">
        <div className="mb-0.5 border-b border-white/10 pb-0.5 flex flex-col items-start gap-0.5 min-w-0">
          <p className="text-[7px] uppercase tracking-[0.2em] italic text-left truncate max-w-full leading-none" style={{ color }}>{typeLabel}</p>
          {pill("text-[5px]", true)}
        </div>
        <div className="flex-1 flex flex-col justify-between min-h-0">
          {items.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center gap-1 min-w-0">
              <span className="text-[8px] font-black italic text-white/30 leading-none w-2 shrink-0 text-center">{index + 1}</span>
              <Thumb item={item} round={round} className="w-5 h-5 shrink-0"/>
              <span className="flex-1 min-w-0 text-[7px] font-semibold text-white leading-tight truncate text-left">{item.name}</span>
              {value(item, true, "text-[7px]")}
            </div>
          ))}
        </div>
      </div>,
    "2x2": narrow,
    "3x2": wide,
    "1x3": makeList(true),
    "3x3": bigLayout(false),
    // 3 colonnes x 4 lignes : même mise en page que 3x3 (repli explicite) ; 3 x 5 : rangs 2 à 5 sur deux lignes
    "3x4": bigLayout(false),
    "3x5": bigLayout(true),
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
      <SegmentedPicker label={t.resume.wSort} value={isSortOption(settings?.sort) ? settings.sort : "streams"}
        options={[{ id: "streams", label: t.ranking.sortOptions.play_count }, { id: "minutes", label: t.resume.wListeningTime }, { id: "rating", label: t.ranking.sortOptions.rating }]}
        onChange={(sort) => onChange({ ...settings, sort })}/>
      <ColorSwatchPicker colors={WIDGET_COLORS} value={settings?.color} onChange={(c) => onChange({ ...settings, color: c })} label={t.resume.wAccentColor} />
    </div>
  );
}
