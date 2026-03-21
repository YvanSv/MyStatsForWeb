"use client";

import RankingView from "../../components/rankings/RankingView";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import { useApiAllDatas } from "@/app/hooks/useApiAllDatas";
import { Suspense } from "react";
import SkeletonRanking from "@/app/components/rankings/SkeletonRanking";
import { useLanguage } from "@/app/context/languageContext";

export function AlbumsPage() {
  const { t } = useLanguage();
  const { getAlbums, getAlbumsMetadata } = useApiAllDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getAlbums, getAlbumsMetadata, 'album');

  return (
      <RankingView 
        title={t.ranking.allthe} type="album" items={items}
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