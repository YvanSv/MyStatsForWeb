import { Calendar } from "lucide-react";
import { SecondaryButton } from "@/app/components/Atomic/Buttons";
import { useLanguage } from "@/app/context/languageContext";
import IntervalsSelector from "@/app/profile/dashboard/[id]/IntervalSelector";
import { getRangeLabel } from "@/app/profile/dashboard/[id]/utils";

// Mêmes styles que la barre de dates du dashboard
const FILTER_BAR_STYLES = {
  DATE_GROUP: "flex items-center gap-1 lg:gap-3",
  DATE_INPUT: `bg-transparent text-sm text-white outline-none [color-scheme:dark] appearance-none
    [&::-webkit-calendar-picker-indicator]:absolute
    [&::-webkit-calendar-picker-indicator]:inset-0
    [&::-webkit-calendar-picker-indicator]:opacity-0
    [&::-webkit-calendar-picker-indicator]:cursor-pointer
    m-0 p-0 w-[90px]`,
};

interface PeriodNavProps {
  range: string;
  offset: number;
  startDate: string;
  endDate: string;
  onIntervalChange: (interval: string) => void;
  onOffsetChange: (delta: number) => void;
  onCustomDateChange: (which: "start" | "end", value: string) => void;
}

/** Sélecteur de période (mêmes valeurs que le dashboard) : intervalle, navigation − / + et dates personnalisées. */
export default function PeriodNav({ range, offset, startDate, endDate, onIntervalChange, onOffsetChange, onCustomDateChange }: PeriodNavProps) {
  const { t } = useLanguage();
  const dict = t.itemDetail;
  const label = getRangeLabel(range, offset, t);
  const isCustom = range === "custom";
  const canGoBack = range !== "lifetime" && !isCustom;

  return (
    <div role="group" aria-label={dict.periodTitle} className="flex flex-col lg:flex-row items-center justify-between gap-3 mb-4">
      <div className="flex items-center justify-center gap-2">
        <SecondaryButton onClick={() => onOffsetChange(-1)} disabled={!canGoBack} ariaLabel={dict.prevPeriod}
          additional={`${canGoBack ? "hover:text-vert" : ""} text-lg px-2.5 pb-1`}>−</SecondaryButton>
        <div className={FILTER_BAR_STYLES.DATE_GROUP}>
          <Calendar size={14} className="text-vert flex-shrink-0" aria-hidden="true" />
          <div className="flex items-center justify-center h-8 min-w-[150px] lg:min-w-[210px]">
            {label ? (
              <span className="text-sm font-medium text-white text-center leading-none">{label}</span>
            ) : (
              <div className="flex items-center gap-2">
                <input type="date" aria-label={dict.dateStart} value={startDate} max={endDate || undefined}
                  className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                  onChange={(e) => onCustomDateChange("start", e.target.value)} />
                <span className="text-gray-600 leading-none" aria-hidden="true">→</span>
                <input type="date" aria-label={dict.dateEnd} value={endDate} min={startDate || undefined}
                  className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                  onChange={(e) => onCustomDateChange("end", e.target.value)} />
              </div>
            )}
          </div>
        </div>
        <SecondaryButton onClick={() => onOffsetChange(1)} disabled={offset === 0 || isCustom} ariaLabel={dict.nextPeriod}
          additional={`${offset !== 0 && !isCustom ? "hover:text-vert" : ""} text-lg px-2.5 pb-1`}>+</SecondaryButton>
      </div>
      <IntervalsSelector range={range} onIntervalChange={onIntervalChange} />
    </div>
  );
}
