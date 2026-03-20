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
    
    // Si le paramètre n'est pas dans l'URL, on renvoie undefined
    // Le backend ignorera alors le filtre et prendra tout.
    const getParamOrUndefined = (val: string | undefined) => val || undefined;

    return {
      sort: params.sort || "play_count",
      direction: (params.direction as "asc" | "desc") || "desc",
      track: params.track || "",
      artist: params.artist || "",
      album: params.album || "",
      
      // MIN : On peut garder "0" par défaut
      streams_min: params.streams_min || "0",
      minutes_min: params.minutes_min || "0",
      engagement_min: params.engagement_min || "0",
      rating_min: params.rating_min || "0",

      // MAX : TRÈS IMPORTANT - On n'envoie QUE si l'utilisateur a filtré
      // Ne plus utiliser metadata.max_... ici pour le fetch !
      streams_max: getParamOrUndefined(params.streams_max),
      minutes_max: getParamOrUndefined(params.minutes_max),
      engagement_max: getParamOrUndefined(params.engagement_max),
      rating_max: getParamOrUndefined(params.rating_max),

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