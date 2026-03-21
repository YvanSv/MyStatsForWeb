"use client";

import RankingView from "../../components/rankings/RankingView";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import { useApiAllDatas } from "@/app/hooks/useApiAllDatas";
import SkeletonRanking from "@/app/components/rankings/SkeletonRanking";
import { Suspense } from "react";
import { useLanguage } from "@/app/context/languageContext";

export function TracksPage() {
  const { t } = useLanguage();
  const { getTracks, getTracksMetadata } = useApiAllDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getTracks, getTracksMetadata, 'track');

  return (
    <RankingView 
      title={t.ranking.allthe} type="track" items={items}
      sortConfig={currentSort} onSort={handleSort} loading={status.loading}
      hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
      filterConfig={filterConfig}
    />
  );
}

export default function TracksSuspense() {
  return (
    <Suspense fallback={<SkeletonRanking />}>
      <TracksPage />
    </Suspense>
  );
}