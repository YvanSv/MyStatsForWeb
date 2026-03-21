"use client";

import SkeletonRanking from "@/app/components/rankings/SkeletonRanking";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import RankingView from "../../components/rankings/RankingView";
import { useApiMyDatas } from "@/app/hooks/useApiMyDatas";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import { useLanguage } from "@/app/context/languageContext";

export default function TracksPage() {
  return (
    <ProtectedRoute skeleton={<SkeletonRanking/>}>
      <TracksContent/>
    </ProtectedRoute>
  );
}

function TracksContent() {
  const { t } = useLanguage();
  const { getTracks, getTracksMetadata } = useApiMyDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getTracks, getTracksMetadata, 'track');

  return (
    <RankingView 
      title={t.ranking.allmy} type="track" items={items}
      sortConfig={currentSort} onSort={handleSort} loading={status.loading}
      hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
      filterConfig={filterConfig}
    />
  );
}