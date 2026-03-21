"use client";

import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import SkeletonRanking from "@/app/components/rankings/SkeletonRanking";
import { useApiMyDatas } from "@/app/hooks/useApiMyDatas";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import RankingView from "@/app/components/rankings/RankingView";
import { useLanguage } from "@/app/context/languageContext";

export default function ArtistsPage() {
  return (
    <ProtectedRoute skeleton={<SkeletonRanking/>}>
      <ArtistsContent/>
    </ProtectedRoute>
  );
}

function ArtistsContent() {
  const { t } = useLanguage();
  const { getArtists, getArtistsMetadata } = useApiMyDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getArtists, getArtistsMetadata, 'artist');

  return (
    <RankingView 
      title={t.ranking.allmy} type="artist" items={items}
      sortConfig={currentSort} onSort={handleSort} loading={status.loading}
      hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
      filterConfig={filterConfig}
    />
  );
}