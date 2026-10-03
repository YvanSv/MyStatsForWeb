"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ErrorState } from "@/app/components/Atomic/Error/Error";
import { useLanguage } from "@/app/context/languageContext";
import type { ItemType } from "@/app/hooks/apiTypes";
import { ApiError } from "@/app/services/api";
import { errorMessage } from "@/app/services/errors";
import ItemCharts from "./ItemCharts";
import ItemDetailHeader from "./ItemDetailHeader";
import ItemDetailSkeleton from "./ItemDetailSkeleton";
import ItemLists from "./ItemLists";
import ItemStats from "./ItemStats";
import PeriodNav from "./PeriodNav";
import { useItemDetail } from "./useItemDetail";

/** Page de détail statistique d'un élément (titre, album ou artiste) de l'utilisateur connecté, partagée par les trois routes. */
export default function ItemDetailPage({ type }: { type: ItemType }) {
  const { id } = useParams<{ id?: string }>();
  const { t } = useLanguage();
  const dict = t.itemDetail;
  const [range, setRange] = useState("lifetime");
  const [offset, setOffset] = useState(0);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [metric, setMetric] = useState<"streams" | "minutes">("minutes");
  const { data, loading, error, retry, startDate, endDate } = useItemDetail({
    type, id: id ? `${id}` : undefined, range, offset, customStart, customEnd,
  });

  const onIntervalChange = (interval: string) => {
    setOffset(0);
    // La période personnalisée part de la période affichée, pour pouvoir l'ajuster
    if (interval === "custom" && range !== "custom") {
      setCustomStart(startDate);
      setCustomEnd(endDate);
    }
    setRange(interval);
  };
  // Le début ne peut pas dépasser la fin : la borne non saisie suit alors la valeur saisie
  const onCustomDateChange = (which: "start" | "end", value: string) => {
    if (!value) return;
    let from = customStart || startDate;
    let to = customEnd || endDate;
    if (which === "start") {
      from = value;
      if (to && from > to) to = from;
    } else {
      to = value;
      if (from && from > to) from = to;
    }
    setCustomStart(from);
    setCustomEnd(to);
    setOffset(0);
    setRange("custom");
  };

  if (!data && loading) return <ItemDetailSkeleton />;
  if (!data) {
    const status = error instanceof ApiError ? error.status : undefined;
    if (status === 404) return <ErrorState status={404} title={dict.notFound} message={dict.notFoundMessage} />;
    return <ErrorState status={status} title={dict.loadError} message={errorMessage(error, t)} onRetry={retry} />;
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto p-3 py-6 sm:p-5 lg:p-8 max-w-[1440px]" aria-busy={loading}>
        <ItemDetailHeader entity={data.entity} />
        <PeriodNav range={range} offset={offset} startDate={startDate} endDate={endDate}
          onIntervalChange={onIntervalChange} onOffsetChange={(d) => setOffset((o) => o + d)} onCustomDateChange={onCustomDateChange} />
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {loading && <p role="status" className="sr-only">{dict.loading}</p>}
          <ItemStats stats={data.stats} />
          <ItemCharts charts={data.charts} range={range} metric={metric} onMetricChange={setMetric} />
          <ItemLists detail={data} />
        </div>
      </div>
    </main>
  );
}
