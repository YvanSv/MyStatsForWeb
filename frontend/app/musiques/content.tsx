"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useApi } from "../hooks/useApi";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataInfo } from "../data/DataInfos";
import RankingView from "../components/rankings/RankingView";

type SortKey = 'title' | 'total_minutes' | 'engagement' | 'play_count' | 'rating';

export default function MusiquesContent() {
  const searchParams = useSearchParams();
  const { getMusics, getMusicsMetadata } = useApi();
  const [musics, setMusics] = useState<DataInfo[]>([]);
  const [metadata, setMetadata] = useState({ max_streams: 9999999, max_minutes: 9999999, max_rating: 5 });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = useMemo(() => ({
    sort: (searchParams.get("sort") as SortKey) || "play_count",
    direction: (searchParams.get("direction") as "asc" | "desc") || "desc",
    track: searchParams.get("track") || "",
    artist: searchParams.get("artist") || "",
    album: searchParams.get("album") || "",
    streams_min: searchParams.get("streams_min") || "0",
    streams_max: searchParams.get("streams_max") || "9999999",
    minutes_min: searchParams.get("minutes_min") || "0",
    minutes_max: searchParams.get("minutes_max") || "9999999",
    engagement_min: searchParams.get("engagement_min") || "0",
    engagement_max: searchParams.get("engagement_max") || "100",
    rating_min: searchParams.get("rating_min") || "0",
    rating_max: searchParams.get("rating_max") || "10",
  }), [searchParams]);

  const musicFilters = useMemo(() => ({
    search: { track: true, artist: true, album: true },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    }
  }), [metadata]);

  const fetchMusics = useCallback(async (currentOffset: number, isNewSort: boolean) => {
    setLoading(true); 
    try {
      const newData = await getMusics({
        offset: currentOffset,
        limit: 50,
        ...currentSort
      });

      setHasMore(newData.length === 50);
      setMusics(prev => (isNewSort || currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) { console.error("Erreur API :", err); }
    finally { setLoading(false); }
  }, [getMusics, currentSort]);

  useEffect(() => {
    getMusicsMetadata().then(setMetadata);
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchMusics(0, true);
  }, [searchParams, fetchMusics]);
  
  const handleSort = (key: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSort.sort === key) {
      params.set("direction", currentSort.direction === "desc" ? "asc" : "desc");
    } else {
      params.set("sort", key);
      params.set("direction", "desc");
    }
    params.set("offset", "0");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const loadMore = () => {
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    fetchMusics(nextOffset, false);
  };
  
  return (
    <RankingView title="Toutes mes" type="track" items={musics}
      sortConfig={currentSort} onSort={handleSort} loading={loading}
      hasMore={hasMore} loadMore={loadMore} filterConfig={musicFilters}
    />
  );
}