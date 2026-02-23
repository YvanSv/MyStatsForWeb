"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataInfo } from "../../data/DataInfos";
import RankingView from "../../components/rankings/RankingView";
import { useApiAllDatas } from "@/app/hooks/useApiAllDatas";

type SortKey = 'name' | 'total_minutes' | 'engagement' | 'play_count' | 'rating';

const today = new Date();
const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
const formattedDay = String(today.getDate()).padStart(2, '0');
const formattedYear = today.getFullYear();

export default function ArtistesContent() {
  const searchParams = useSearchParams();
  const { getArtists, getArtistsMetadata } = useApiAllDatas();
  const [artists, setArtists] = useState<DataInfo[]>([]);
  const [metadata, setMetadata] = useState({
    max_streams: 99999999,
    max_minutes: 99999999,
    max_rating: 5,
    date_min: "1890-01-01",
    date_max: `${formattedYear}-${formattedMonth}-${formattedDay}`
  });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = useMemo(() => ({
    sort: (searchParams.get("sort") as SortKey) || "play_count",
    direction: (searchParams.get("direction") as "asc" | "desc") || "desc",
    artist: searchParams.get("artist") || "",
    streams_min: searchParams.get("streams_min") || "0",
    streams_max: searchParams.get("streams_max") || "99999999",
    minutes_min: searchParams.get("minutes_min") || "0",
    minutes_max: searchParams.get("minutes_max") || "99999999",
    engagement_min: searchParams.get("engagement_min") || "0",
    engagement_max: searchParams.get("engagement_max") || "100",
    rating_min: searchParams.get("rating_min") || "0",
    rating_max: searchParams.get("rating_max") || "10",
    date_min: searchParams.get("date_min") || "1890-01-01",
    date_max: searchParams.get("date_max") || `${formattedYear}-${formattedMonth}-${formattedDay}`,
  }), [searchParams]);

  const artistFilters = {
    search: { artist: true },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    },
    period: {
      min: metadata.date_min,
      max: metadata.date_max
    }
  };

  const fetchArtists = useCallback(async (currentOffset: number, isNewSort: boolean = false) => {
    setLoading(true);
    try {
      const newData = await getArtists({
        offset: currentOffset,
        limit: 50,
        ...currentSort
      });
      setHasMore(newData.length === 50);
      setArtists(prev => (isNewSort || currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [getArtists, currentSort]);
  
  useEffect(() => {
    getArtistsMetadata().then(setMetadata);
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchArtists(0, true);
  }, [searchParams, fetchArtists]);

  const handleSort = (key: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSort.sort === key) {
      params.set("direction", currentSort.direction === "desc" ? "asc" : "desc");
    } else {
      params.set("sort", key);
      params.set("direction", "desc");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const loadMore = () => {
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    fetchArtists(nextOffset);
  };

  return (
    <RankingView title="Tous mes" type="artist" items={artists}
      sortConfig={currentSort} onSort={handleSort} loading={loading}
      hasMore={hasMore} loadMore={loadMore} filterConfig={artistFilters}
    />
  );
}