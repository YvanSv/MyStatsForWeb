"use client";

import RankingView from "../../components/rankings/RankingView";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import { useApiAllDatas } from "@/app/hooks/useApiAllDatas";
import { Suspense } from "react";
import SkeletonRanking from "@/app/components/rankings/SkeletonRanking";
import { useLanguage } from "@/app/context/languageContext";

export function ArtistsPage() {
  const { t } = useLanguage();
  const { getArtists, getArtistsMetadata } = useApiAllDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getArtists, getArtistsMetadata, 'artist');

  return (
    <RankingView 
      title={t.ranking.allthe} type="artist" items={items}
      sortConfig={currentSort} onSort={handleSort} loading={status.loading}
      hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
      filterConfig={filterConfig}
    />
  );
}

export default function ArtistsSuspense() {
  return (
    <Suspense fallback={<SkeletonRanking />}>
      <ArtistsPage />
    </Suspense>
  );
}