"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useApi } from "../hooks/useApi";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataInfo } from "../data/DataInfos";
import RankingView from "../components/rankings/RankingView";

type SortKey = 'name' | 'total_minutes' | 'play_count' | 'rating' | 'engagement';

export default function AlbumsContent() {
  const searchParams = useSearchParams();
  const { getAlbums, getAlbumsMetadata } = useApi();
  const [albums, setAlbums] = useState<DataInfo[]>([]);
  const [metadata, setMetadata] = useState({ max_streams: 99999999, max_minutes: 99999999, max_rating: 5 });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = useMemo(() => ({
    sort: (searchParams.get("sort") as SortKey) || "play_count",
    direction: (searchParams.get("direction") as "asc" | "desc") || "desc",
    artist: searchParams.get("artist") || "",
    album: searchParams.get("album") || "",
    streams_min: searchParams.get("streams_min") || "0",
    streams_max: searchParams.get("streams_max") || "99999999",
    minutes_min: searchParams.get("minutes_min") || "0",
    minutes_max: searchParams.get("minutes_max") || "99999999",
    engagement_min: searchParams.get("engagement_min") || "0",
    engagement_max: searchParams.get("engagement_max") || "100",
    rating_min: searchParams.get("rating_min") || "0",
    rating_max: searchParams.get("rating_max") || "10",
  }), [searchParams]);

  const albumFilters = {
    search: { album: true, artist: true },
    stats: {
      streams: { min: 0, max: metadata.max_streams },
      minutes: { min: 0, max: metadata.max_minutes },
      engagement: { min: 0, max: 100 },
      rating: { min: 0, max: metadata.max_rating }
    }
  };

  const fetchAlbums = useCallback(async (currentOffset: number, isNewSort: boolean) => {
    setLoading(true);
    try {
      const newData = await getAlbums({
        offset: currentOffset,
        limit: 50,
        ...currentSort
      });
      setHasMore(newData.length === 50);
      setAlbums(prev => (isNewSort || currentOffset === 0 ? newData : [...prev, ...newData]));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [getAlbums, currentSort]);
  
  useEffect(() => {
    getAlbumsMetadata().then(setMetadata);
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchAlbums(0, true);
  }, [searchParams, fetchAlbums]);

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
    fetchAlbums(nextOffset, false);
  };

  return (
    <RankingView title="Toutes mes" type="album" items={albums}
      sortConfig={currentSort} onSort={handleSort} loading={loading}
      hasMore={hasMore} loadMore={loadMore} filterConfig={albumFilters}
    />
  );
}