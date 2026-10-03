import { useMemo } from "react";
import { useApiMyDatas } from "@/app/hooks/useApiMyDatas";
import { useAsyncData } from "@/app/hooks/useAsyncData";
import type { ItemDetail, ItemType } from "@/app/hooks/apiTypes";
import { formatToInputDate, getDateRange } from "@/app/profile/dashboard/[id]/utils";

interface ItemDetailQuery {
  type: ItemType;
  id: string | undefined;
  /** Même valeurs que le sélecteur de période du dashboard (today, week, month, 1m, season, 6m, year, lifetime, custom). */
  range: string;
  offset: number;
  /** Bornes saisies à la main (AAAA-MM-JJ), utilisées quand range vaut « custom ». */
  customStart: string;
  customEnd: string;
}

/** Bornes ISO de la période demandée (null = sans borne), calculées comme le dashboard (jours locaux de l'utilisateur). */
export const resolveRange = (range: string, offset: number, customStart: string, customEnd: string) => {
  if (range === "custom" && customStart && customEnd) {
    const from = new Date(`${customStart}T00:00:00`);
    const to = new Date(`${customEnd}T23:59:59.999`);
    return {
      start: Number.isNaN(from.getTime()) ? null : from.toISOString(),
      end: Number.isNaN(to.getTime()) ? null : to.toISOString(),
    };
  }
  return getDateRange(range, offset);
};

/**
 * Charge les statistiques détaillées d'un élément sur la période choisie (réponses périmées ignorées, relance possible).
 * Expose aussi les bornes de la période au format des inputs date.
 */
export function useItemDetail({ type, id, range, offset, customStart, customEnd }: ItemDetailQuery) {
  const { getItemDetail } = useApiMyDatas();
  const { start, end } = useMemo(() => resolveRange(range, offset, customStart, customEnd), [range, offset, customStart, customEnd]);

  const state = useAsyncData<ItemDetail | null>(
    () => (id ? getItemDetail(type, id, start, end) : Promise.resolve(null)),
    [getItemDetail, type, id, start, end],
  );

  return { ...state, startDate: formatToInputDate(start), endDate: formatToInputDate(end) };
}
