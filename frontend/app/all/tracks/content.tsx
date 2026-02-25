"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataInfo } from "../../data/DataInfos";
import RankingView from "../../components/rankings/RankingView";
import { DEFAULT_METADATA } from "../../data/FiltresDefault";
import { useApiAllDatas } from "@/app/hooks/useApiAllDatas";

type SortKey = 'title' | 'total_minutes' | 'engagement' | 'play_count' | 'rating';

export default function MusiquesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getTracks, getTracksMetadata } = useApiAllDatas();

  const [musics, setMusics] = useState<DataInfo[]>([]);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [status, setStatus] = useState({ loading: false, hasMore: true, offset: 0 });

  const currentSort = useMemo(() => {
    const params = Object.fromEntries(searchParams.entries());
    // Fonction utilitaire pour valider le format YYYY-MM-DD
    const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    return {
      sort: (params.sort as SortKey) || "play_count",
      direction: (params.direction as "asc" | "desc") || "desc",
      track: params.track || "",
      artist: params.artist || "",
      album: params.album || "",
      streams_min: params.streams_min || "0",
      streams_max: params.streams_max || String(metadata.max_streams),
      minutes_min: params.minutes_min || "0",
      minutes_max: params.minutes_max || String(metadata.max_minutes),
      engagement_min: params.engagement_min || "0",
      engagement_max: params.engagement_max || "100",
      rating_min: params.rating_min || "0",
      rating_max: params.rating_max || String(metadata.max_rating),
      date_min: isValidDate(params.date_min)
        ? params.date_min
        : (isValidDate(metadata.date_min) ? metadata.date_min : "1890-01-01"),
      date_max: isValidDate(params.date_max)
        ? params.date_max
        : (isValidDate(metadata.date_max) ? metadata.date_max : new Date().toISOString().split('T')[0]),
    };
  }, [searchParams, metadata]);

  // Configuration pour la Sidebar
  const musicFilters = useMemo(() => ({
    search: { track: true, artist: true, album: true },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    },
    period: { min: metadata.date_min, max: metadata.date_max }
  }), [metadata]);

  const fetchData = useCallback(async (newOffset: number, clearExisting: boolean) => {
    setStatus(prev => ({ ...prev, loading: true }));
    try {
      const newData = await getTracks({ offset: newOffset, limit: 50, ...currentSort });
      
      setMusics(prev => clearExisting ? newData : [...prev, ...newData]);
      setStatus(prev => ({ 
        ...prev, 
        offset: newOffset, 
        hasMore: newData.length === 50, 
        loading: false 
      }));
    } catch (err) {
      console.error("Erreur API :", err);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [getTracks, currentSort]);

  // Initialisation Metadata
  useEffect(() => {
    getTracksMetadata().then(data => setMetadata(prev => ({ ...prev, ...data })));
  }, [getTracksMetadata]);

  // Trigger au changement de filtres/sort
  useEffect(() => {fetchData(0, true)}, [searchParams, fetchData]);

  // --- HANDLERS ---
  const handleSort = (key: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    const isSameSort = currentSort.sort === key;
    
    params.set("sort", key);
    params.set("direction", isSameSort && currentSort.direction === "desc" ? "asc" : "desc");
    params.set("offset", "0");
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <RankingView title="Tous les" type="track" items={musics}
      sortConfig={currentSort} onSort={handleSort} loading={status.loading}
      hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
      filterConfig={musicFilters}
    />
  );
}