"use client";

import RankingView from "../../components/rankings/RankingView";
import { useRankingLogic } from "@/app/hooks/useRankingLogic";
import { useApiAllDatas } from "@/app/hooks/useApiAllDatas";

export default function TracksPage() {
  const { getTracks, getTracksMetadata } = useApiAllDatas();
  const { items, status, currentSort, filterConfig, handleSort, fetchData } =
    useRankingLogic(getTracks, getTracksMetadata, 'track');

  return (
    <RankingView 
      title="Tous les" type="track" items={items}
      sortConfig={currentSort} onSort={handleSort} loading={status.loading}
      hasMore={status.hasMore} loadMore={() => fetchData(status.offset + 50, false)} 
      filterConfig={filterConfig}
    />
  );
}