"use client";

import SkeletonRanking from "@/app/components/rankings/SkeletonRanking";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { useApiMyDatas } from "@/app/hooks/useApiMyDatas";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import RankingView from "@/app/components/rankings/RankingView";

export default function AlbumsPage() {
  return (
    <ProtectedRoute skeleton={<SkeletonRanking/>}>
      <AlbumsContent/>
    </ProtectedRoute>
  );
}

function AlbumsContent() {
  const { getAlbums, getAlbumsMetadata } = useApiMyDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getAlbums, getAlbumsMetadata, 'album');

  return (
      <RankingView 
        title="Tous mes" type="album" items={items}
        sortConfig={currentSort} onSort={handleSort} loading={status.loading}
        hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
        filterConfig={filterConfig}
      />
    );
}