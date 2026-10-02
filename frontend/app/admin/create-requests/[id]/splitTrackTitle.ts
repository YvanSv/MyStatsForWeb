/**
 * Découpe « Artiste - Titre » au PREMIER « - » seulement (comme AppleMusicWorker._get_parts côté backend) :
 * l'artiste est ce qui précède, le titre tout le reste. Robuste si le titre est absent ou vide.
 */
export const splitTrackTitle = (title: string | null | undefined): { artist: string | undefined, title: string | undefined } => {
  if (!title) return { artist: undefined, title: undefined };
  const idx = title.indexOf(" - ");
  if (idx === -1) return { artist: title, title: undefined };
  return { artist: title.slice(0, idx), title: title.slice(idx + 3) };
};
