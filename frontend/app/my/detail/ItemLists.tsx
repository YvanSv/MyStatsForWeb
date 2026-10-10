import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/app/context/languageContext";
import type { DetailChild, ItemDetail, ItemType } from "@/app/hooks/apiTypes";
import { formatMinutes, formatRating, formatStat, formatStreams, ratingColorClass, withUnit } from "@/app/components/rankings/format";
import { formatDate } from "@/app/services/formatDate";
import { itemDetailPath } from "@/app/services/url";
import { nextSort, sortChildren, type ChildSortKey, type SortDirection } from "./sortItems";

// Largeurs communes aux colonnes de stats : les boutons de tri de l'en-tête restent alignés au-dessus des valeurs
const COL = { streams: "w-20 text-right", minutes: "w-24 text-right hidden sm:block", rating: "w-12 text-right" } as const;
// Même largeur pour les boutons : affichage en flex (à partir de sm pour les minutes) pour que la flèche reste calée à droite, comme la valeur
const BTN_COL = { streams: "w-20 flex", minutes: "w-24 hidden sm:flex", rating: "w-12 flex" } as const;
const SORT_KEYS: ChildSortKey[] = ["streams", "minutes", "rating"];

function ChildList({ title, id, type, items }: { title: string; id: string; type: ItemType; items: DetailChild[] }) {
  const { t } = useLanguage();
  const dict = t.itemDetail;
  const locale = t.common.locale;
  const [sort, setSort] = useState<{ key: ChildSortKey | null; direction: SortDirection }>({ key: "streams", direction: "desc" });
  const shown = sortChildren(items, sort.key, sort.direction);
  const sortLabels: Record<ChildSortKey, string> = { streams: dict.sortByStreams, minutes: dict.sortByMinutes, rating: dict.sortByRating };
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3 px-2">
        <h2 id={id} className="text-lg font-bold">{title}</h2>
        {items.length > 1 && (
          <div role="group" aria-label={dict.sortGroup} className="flex items-center gap-3">
            {SORT_KEYS.map((key) => {
              const active = sort.key === key;
              const state = active ? (sort.direction === "desc" ? dict.sortDescending : dict.sortAscending) : null;
              return (
                // La colonne garde sa largeur (alignement avec les valeurs), mais seul le glyphe est cliquable
                <div key={key} className={`${BTN_COL[key]} items-center justify-end`}>
                  <button type="button" onClick={() => setSort((s) => nextSort(s, key))}
                    aria-label={state ? `${sortLabels[key]} (${state})` : sortLabels[key]}
                    className={`flex items-center justify-center h-6 min-w-6 px-1 text-xs font-bold rounded-md cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-vert ${active ? "text-vert" : "text-gray-500 hover:text-white"}`}>
                    {active
                      ? (sort.direction === "desc" ? <ArrowDown size={14} aria-hidden="true" /> : <ArrowUp size={14} aria-hidden="true" />)
                      : <span aria-hidden="true">–</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p role="status" className="text-sm text-gray-500">{dict.emptyList}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {shown.map((item, i) => (
            <li key={item.id} className="relative flex items-center gap-3 px-2 py-1.5 rounded-2xl bg-bg2/25 border border-white/5 hover:border-vert/30 transition-all">
              <span className="text3 w-7 text-right font-mono text-sm" aria-hidden="true">#{i + 1}</span>
              <div className={`relative h-10 w-10 flex-shrink-0 overflow-hidden bg-bg2 border border-white/10 ${type === "artist" ? "rounded-full" : "rounded-lg"}`}>
                {item.image ? <Image src={item.image} alt="" fill sizes="40px" className="object-cover" /> : null}
              </div>
              <Link href={itemDetailPath(type, item.id)} className="flex-1 min-w-0 truncate font-bold text-sm after:absolute after:inset-0 after:content-[''] outline-none focus-visible:after:ring-2 focus-visible:after:ring-vert focus-visible:after:rounded-[inherit]">
                {item.name}
              </Link>
              <span className={`text3 text-xs whitespace-nowrap ${COL.streams}`}>{formatStreams(item.streams, locale)} {t.rankingcell.unitStreams}</span>
              <span className={`text3 text-xs whitespace-nowrap ${COL.minutes}`}>{withUnit(formatMinutes(item.minutes, locale), ` ${t.rankingcell.unitMinutes}`)}</span>
              <span className={`text-xs ${COL.rating} ${ratingColorClass(item.rating)}`}>{withUnit(formatRating(item.rating, locale), "★")}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const formatDuration = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** Listes de l'élément : enfants (titres / albums selon le type) puis dernières écoutes. */
export default function ItemLists({ detail }: { detail: ItemDetail }) {
  const { t } = useLanguage();
  const dict = t.itemDetail;
  const { type } = detail.entity;
  const { tracks, albums } = detail.children;
  const dateOptions: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" };

  return (
    <div className="flex flex-col gap-6">
      {(tracks || albums) && (
        <div className={`grid gap-6 ${type === "artist" && tracks && albums ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {tracks && <ChildList id="item-tracks-title" type="track" items={tracks} title={type === "album" ? dict.albumTracks : dict.topTracks} />}
          {albums && <ChildList id="item-albums-title" type="album" items={albums} title={dict.topAlbums} />}
        </div>
      )}

      <section aria-labelledby="item-recent-title" className="flex flex-col gap-2">
        <h2 id="item-recent-title" className="text-lg font-bold">{dict.recentPlays}</h2>
        {detail.recent_plays.length === 0 ? (
          <p role="status" className="text-sm text-gray-500">{dict.noRecentPlays}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {detail.recent_plays.map((play, i) => (
              <li key={`${play.played_at}-${i}`} className="flex items-center justify-between gap-4 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 text-sm">
                <time dateTime={play.played_at}>{formatDate(play.played_at, t.common.locale, dateOptions)}</time>
                <span className="text3 font-mono" aria-label={`${dict.duration} ${formatDuration(play.ms_played)}`}>{formatDuration(play.ms_played)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
