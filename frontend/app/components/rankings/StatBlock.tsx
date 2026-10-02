import { DataInfo } from "@/app/data/DataInfos";
import { formatMinutes, formatStat, formatStreams, isValidNumber } from "./format";

export interface StatBlockStyles {
  STAT_BLOCK: string;
  STAT_VALUE: (isActive: boolean) => string;
  STAT_LABEL: string;
}

interface StatBlocksProps {
  element: DataInfo;
  sort: string;
  locale: string;
  unitStreams: string;
  unitMinutes: string;
  styles: StatBlockStyles;
}

/** Les trois blocs de stats (streams, minutes, engagement), mis en forme par les styles de la cellule. */
export default function StatBlocks({ element, sort, locale, unitStreams, unitMinutes, styles }: StatBlocksProps) {
  const stats = [
    { key: "play_count", value: element.play_count, text: formatStreams(element.play_count, locale), unit: unitStreams },
    { key: "total_minutes", value: element.total_minutes, text: formatMinutes(element.total_minutes, locale), unit: unitMinutes },
    { key: "engagement", value: element.engagement, text: formatStat(element.engagement, locale), unit: "%" },
  ];
  return (
    <>
      {stats.map(({ key, value, text, unit }) => (
        <div key={key} className={styles.STAT_BLOCK}>
          <span className={styles.STAT_VALUE(sort === key)}>{text}</span>
          {isValidNumber(value) && <span className={styles.STAT_LABEL}>{unit}</span>}
        </div>
      ))}
    </>
  );
}
