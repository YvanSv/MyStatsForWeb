import { useEffect, useState } from "react";
import { useProfile } from "@/app/hooks/useProfile";
import { UserProfile } from "@/app/data/DataInfos";
import { ApiError } from "@/app/services/api";
import { DashboardStats, formatToInputDate, getDateRange, INITIAL_STATS } from "./utils";

interface DashboardQuery {
  id: string | undefined;
  range: string;
  offset: number;
  /** Bornes saisies à la main (AAAA-MM-JJ), utilisées quand range vaut « custom ». */
  customStart: string;
  customEnd: string;
}

/**
 * Charge le profil et les stats du dashboard (annulation des réponses périmées, erreurs séparées, relance).
 * Expose aussi les bornes de la période réellement interrogée (au format des inputs date).
 */
export function useDashboardData({ id, range, offset, customStart, customEnd }: DashboardQuery) {
  const { getDashboard, getProfile } = useProfile();
  const [loadingProfile, setLoadingProfile] = useState(!!id);
  const [loadingStats, setLoadingStats] = useState(!!id);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [extendedStats, setExtendedStats] = useState(INITIAL_STATS as DashboardStats);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<ApiError | null>(null);
  const [statsError, setStatsError] = useState<ApiError | null>(null);
  // Incrémentés par « Réessayer » pour relancer le chargement du profil ou des stats
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [statsAttempt, setStatsAttempt] = useState(0);

  const retry = () => {
    if (profileError) setProfileAttempt(n => n + 1);
    if (statsError) setStatsAttempt(n => n + 1);
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadData = async () => {
      try {
        setLoadingProfile(true);
        setProfileError(null);
        const data = await getProfile(id+'');
        if (!cancelled) setProfile(data);
      } catch (err: any) {if (!cancelled) setProfileError(err)}
      finally {if (!cancelled) setLoadingProfile(false)}
    };
    loadData();
    return () => { cancelled = true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profileAttempt]);

  useEffect(() => {
    if (!id) return;
    // Une réponse arrivée après un changement de période est ignorée
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fetchStats = async () => {
      setLoadingStats(true);
      setStatsError(null);

      let start: string | null, end: string | null;
      if (range === 'custom' && customStart && customEnd) {
        const from = new Date(`${customStart}T00:00:00`);
        const to = new Date(`${customEnd}T23:59:59.999`);
        start = isNaN(from.getTime()) ? null : from.toISOString();
        end = isNaN(to.getTime()) ? null : to.toISOString();
      } else ({ start, end } = getDateRange(range, offset));
      setStartDate(formatToInputDate(start));
      setEndDate(formatToInputDate(end));

      try {
        const stats = await getDashboard(`${id}`, start, end);
        if (cancelled) return;
        setExtendedStats(stats);
      } catch (err: any) {
        if (cancelled) return;
        // Les dernières stats valides sont conservées : l'erreur est affichée dans le bandeau
        setStatsError(err ?? new ApiError(0, "stats"));
      } finally {
        if (!cancelled) timer = setTimeout(() => setLoadingStats(false), 150);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, range, offset, customStart, customEnd, statsAttempt]);

  return {
    profile, profileError, statsError, extendedStats, startDate, endDate, retry,
    loading: loadingProfile || loadingStats,
  };
}
