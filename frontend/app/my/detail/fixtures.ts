import type { ItemDetail, ItemType } from "@/app/hooks/apiTypes";

/** Réponse conforme au contrat de GET /data/my/{entity}/{id}/detail, pour les tests. */
export const makeDetail = (type: ItemType = "track", over: Partial<ItemDetail> = {}): ItemDetail => ({
  entity: {
    type, id: 12, name: "Nom de l'élément", image: "https://img/cover.jpg",
    artist: type === "artist" ? null : { id: 3, name: "Artiste Parent" },
    album: type === "track" ? { id: 7, name: "Album Parent" } : null,
  },
  stats: {
    streams: 1234, minutes: 5678.4, rating: 1.5,
    first_played_at: "2024-03-05T10:00:00Z", last_played_at: "2026-09-20T18:30:00Z",
    active_days: 88, avg_minutes_per_active_day: 12.34, share_of_total_streams: 2.5,
    rank: { streams: 3, minutes: 5, rating: null, out_of: 412 },
  },
  charts: {
    hourly: [{ hour: "0h", value: 1, streams: 1 }],
    weekly: [{ day: "Lun", value: 1, streams: 1 }],
    monthly: [{ month: "Jan", value: 1, streams: 1 }],
    annual: [{ year: "2025", value: 1, streams: 1 }],
    cumulative: [{ date: "2026-01-01", minutes: 1, streams: 1 }],
  },
  children: {
    tracks: type === "track" ? null : [
      { id: 21, name: "Enfant Titre 1", image: null, streams: 50, minutes: 120, rating: 1.2 },
      { id: 22, name: "Enfant Titre 2", image: "https://img/t2.jpg", streams: 10, minutes: 30, rating: null },
    ],
    albums: type === "artist" ? [{ id: 31, name: "Enfant Album", image: null, streams: 60, minutes: 150, rating: 0.8 }] : null,
  },
  recent_plays: [
    { played_at: "2026-09-20T18:30:00Z", ms_played: 185000 },
    { played_at: "2026-09-19T08:00:00Z", ms_played: 60000 },
  ],
  ...over,
});
