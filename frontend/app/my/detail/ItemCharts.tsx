import { AnnualChart, ClockChart, CumulativeChart, MonthlyChart, WeeklyChart } from "@/app/components/dashboard/Charts";
import { MetricSwitch } from "@/app/profile/dashboard/[id]/MetricSwitch";
import { useLanguage } from "@/app/context/languageContext";
import type { ItemDetail } from "@/app/hooks/apiTypes";

// Périodes assez longues pour afficher le graphique mensuel (comme le dashboard)
const WIDE_RANGES = ["6m", "year", "lifetime"];

interface ItemChartsProps {
  charts: ItemDetail["charts"];
  range: string;
  metric: "streams" | "minutes";
  onMetricChange: (metric: "streams" | "minutes") => void;
}

/** Graphiques d'écoute de l'élément : horaire, semaine, mois, année et cumul, avec bascule streams / minutes. */
export default function ItemCharts({ charts, range, metric, onMetricChange }: ItemChartsProps) {
  const { t } = useLanguage();
  const dict = t.itemDetail;
  return (
    <section aria-labelledby="item-charts-title" className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="item-charts-title" className="text-lg font-bold">{dict.chartsTitle}</h2>
        <MetricSwitch value={metric} onChange={onMetricChange} />
      </div>
      <p className="sr-only">{dict.chartsSummary}</p>
      <div className="flex flex-col gap-3 lg:gap-4">
        {range !== "today" && <CumulativeChart data={charts.cumulative} />}
        <div className={`grid gap-3 lg:gap-4 ${range === "today" ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
          <ClockChart data={charts.hourly} metric={metric} daysCount={range === "today" ? 1 : 0} />
          {range !== "today" && <WeeklyChart data={charts.weekly} metric={metric} />}
          {WIDE_RANGES.includes(range) && <MonthlyChart data={charts.monthly} metric={metric} />}
          {range === "lifetime" && <AnnualChart data={charts.annual} metric={metric} />}
        </div>
      </div>
    </section>
  );
}
