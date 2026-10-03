import { Calendar, CalendarDays, Clock, Percent, Play, Star, Timer, Trophy } from "lucide-react";
import CompactStatCard from "@/app/profile/dashboard/[id]/CompactStatCard";
import { useLanguage } from "@/app/context/languageContext";
import type { ItemDetail } from "@/app/hooks/apiTypes";
import { formatMinutes, formatRating, formatStat, ratingColorClass, withUnit } from "@/app/components/rankings/format";
import { formatDate } from "@/app/services/formatDate";

const ICON = "text2 w-4 h-4 lg:w-6 lg:h-6";

/** Cartes de statistiques de l'élément (période choisie) et rangs. */
export default function ItemStats({ stats }: { stats: ItemDetail["stats"] }) {
  const { t } = useLanguage();
  const dict = t.itemDetail;
  const locale = t.common.locale;
  const oneDecimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const rankLabel = (rank: number | null) =>
    rank === null ? dict.noRank : dict.rankOf(rank.toLocaleString(locale), stats.rank.out_of.toLocaleString(locale));

  return (
    <>
      <section aria-labelledby="item-stats-title" className="mb-6">
        <h2 id="item-stats-title" className="text-lg font-bold mb-3">{dict.statsTitle}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4">
          <CompactStatCard label={dict.statStreams} icon={<Play className={ICON} aria-hidden="true" />} value={formatStat(stats.streams, locale)} />
          <CompactStatCard label={dict.statTime} icon={<Timer className={ICON} aria-hidden="true" />}
            value={withUnit(formatMinutes(stats.minutes, locale), ` ${dict.unitMin}`)} />
          <CompactStatCard label={dict.statRating} icon={<Star className={ICON} aria-hidden="true" />}
            value={<span className={ratingColorClass(stats.rating)}>{withUnit(formatRating(stats.rating, locale), " ★")}</span>} />
          <CompactStatCard label={dict.statShare} icon={<Percent className={ICON} aria-hidden="true" />}
            value={`${oneDecimal.format(stats.share_of_total_streams)}%`} />
          <CompactStatCard label={dict.statFirstPlay} icon={<Calendar className={ICON} aria-hidden="true" />}
            value={formatDate(stats.first_played_at, locale)} />
          <CompactStatCard label={dict.statLastPlay} icon={<Calendar className={ICON} aria-hidden="true" />}
            value={formatDate(stats.last_played_at, locale)} />
          <CompactStatCard label={dict.statActiveDays} icon={<CalendarDays className={ICON} aria-hidden="true" />}
            value={withUnit(formatStat(stats.active_days, locale), ` ${dict.unitDays}`)} />
          <CompactStatCard label={dict.statAvgPerDay} icon={<Clock className={ICON} aria-hidden="true" />}
            value={`${oneDecimal.format(stats.avg_minutes_per_active_day)} ${dict.unitMin}`} />
        </div>
      </section>

      <section aria-labelledby="item-ranks-title" className="mb-6">
        <h2 id="item-ranks-title" className="text-lg font-bold mb-3">{dict.ranksTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4">
          <CompactStatCard label={dict.rankStreams} icon={<Trophy className={ICON} aria-hidden="true" />} value={rankLabel(stats.rank.streams)} />
          <CompactStatCard label={dict.rankMinutes} icon={<Trophy className={ICON} aria-hidden="true" />} value={rankLabel(stats.rank.minutes)} />
          <CompactStatCard label={dict.rankRating} icon={<Trophy className={ICON} aria-hidden="true" />} value={rankLabel(stats.rank.rating)} />
        </div>
      </section>
    </>
  );
}
