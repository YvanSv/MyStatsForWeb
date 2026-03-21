"use client";

import RankingView from "../../components/rankings/RankingView";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import { useApiAllDatas } from "@/app/hooks/useApiAllDatas";
import { Suspense } from "react";
import SkeletonRanking from "@/app/components/rankings/SkeletonRanking";

export function AlbumsPage() {
  const { getAlbums, getAlbumsMetadata } = useApiAllDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getAlbums, getAlbumsMetadata, 'album');

  return (
      <RankingView 
        title="Tous les" type="album" items={items}
        sortConfig={currentSort} onSort={handleSort} loading={status.loading}
        hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
        filterConfig={filterConfig}
      />
  );
}

export default function AlbumsSuspense() {
  return (
    <Suspense fallback={<SkeletonRanking />}>
      <AlbumsPage />
    </Suspense>
  );
}