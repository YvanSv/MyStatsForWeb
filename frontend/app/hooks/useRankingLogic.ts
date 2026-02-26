import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function useRankingLogic(fetchFn: any, metadataFn: any, type: 'track' | 'album' | 'artist') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState({ loading: false, hasMore: true, offset: 0 });
  const [metadata, setMetadata] = useState({
    max_streams: 0,
    max_minutes: 0,
    max_rating: 0,
    date_min: "1890-01-01",
    date_max: new Date().toISOString().split('T')[0]
  });

  const cleanDate = (date: any, fallback: string) => {
    const isValid = date && /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!isValid || date === "date_min" || date === "date_max") return fallback;
    return date;
  };

  // Calcul des filtres basé sur l'URL
  const currentSort = useMemo(() => {
    const params = Object.fromEntries(searchParams.entries());
    
    // Fonctions utilitaires pour ne pas envoyer "0" par erreur au premier chargement
    const getSafeMax = (paramValue: string | undefined, metadataValue: number) => {
      if (paramValue) return paramValue;
      // Si pas de param dans l'URL et metadata à 0, on renvoie null ou une valeur infinie
      // pour que le backend ignore le filtre
      return metadataValue > 0 ? String(metadataValue) : undefined;
    };

    return {
      sort: params.sort || "play_count",
      direction: (params.direction as "asc" | "desc") || "desc",
      track: params.track || "",
      artist: params.artist || "",
      album: params.album || "",
      streams_min: params.streams_min || "0",
      streams_max: getSafeMax(params.streams_max, metadata.max_streams),
      minutes_min: params.minutes_min || "0",
      minutes_max: getSafeMax(params.minutes_max, metadata.max_minutes),
      engagement_min: params.engagement_min || "0",
      engagement_max: params.engagement_max || "100",
      rating_min: params.rating_min || "0",
      rating_max: getSafeMax(params.rating_max, metadata.max_rating),
      date_min: cleanDate(params.date_min, metadata.date_min),
      date_max: cleanDate(params.date_max, metadata.date_max),
    };
  }, [searchParams, metadata]);

  // STABILISATION : On utilise une chaîne de caractères pour le useEffect
  // Cela évite de re-déclencher si l'objet currentSort change de référence mais pas de contenu
  const searchParamsKey = searchParams.toString();

  const fetchData = useCallback(async (newOffset: number, clearExisting: boolean) => {
    setStatus(prev => ({ ...prev, loading: true }));
    try {
      const dataToFetch = {
        ...currentSort,
        offset: newOffset,
        limit: 50
      };
      
      const newData = await fetchFn(dataToFetch);
      setItems(prev => clearExisting ? (newData || []) : [...prev, ...(newData || [])]);
      setStatus(prev => ({ 
        ...prev, 
        offset: newOffset, 
        hasMore: newData?.length === 50, 
        loading: false 
      }));
    } catch (err) {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [fetchFn, currentSort, searchParams]);

  useEffect(() => {
    fetchData(0, true);
  }, [searchParamsKey]);

  // CHARGEMENT DES METADATA
  useEffect(() => {
    metadataFn().then((data: any) => {
      if (data) {
        setMetadata(prev => ({
          ...prev,
          ...data,
          date_min: cleanDate(data.date_min, "1890-01-01"),
          date_max: cleanDate(data.date_max, new Date().toISOString().split('T')[0])
        }));
      }
    });
  }, [metadataFn]);

  const filterConfig = useMemo(() => ({
    search: { track: type === 'track', artist: true, album: type !== 'artist' },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    },
    period: { min: metadata.date_min, max: metadata.date_max }
  }), [metadata, type]);

  const handleSort = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("direction", currentSort.sort === key && currentSort.direction === "desc" ? "asc" : "desc");
    params.set("offset", "0");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return { items, metadata, status, currentSort, filterConfig, handleSort, fetchData };
}