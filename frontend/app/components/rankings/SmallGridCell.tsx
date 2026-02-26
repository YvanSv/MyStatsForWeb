import { DataInfo } from "@/app/data/DataInfos";
import { GENERAL_STYLES } from "@/app/styles/general";
import Image from "next/image";

interface SmallGridCellProps {
  element: DataInfo;
  index: number;
  sort: string;
}

const SMALL_GRID_STYLES = {
  // Conteneur principal (Plus compact)
  WRAPPER: (isArtist: boolean) => `
    group bg-bg2/30 backdrop-blur-md border border-white/5 transition-all 
    hover:border-vert/40 hover:-translate-y-1 flex flex-col h-full rounded-3xl relative
    ${isArtist ? 'p-2.5 bg-bg2/20' : 'p-3 pb-1.5'}
  `,

  // Badge d'index (Réduit pour la petite grille)
  INDEX_BADGE: `${GENERAL_STYLES.TEXT3} absolute top-3 left-3 z-10 flex items-center justify-center 
                min-w-[18px] h-[18px] px-1 rounded-full text-[9px] 
                font-black group-hover:text-vert transition-colors`,

  // Section Image
  IMAGE_CONTAINER: (isArtist: boolean) => `
    relative aspect-square overflow-hidden shadow-xl bg-bg2/50 mb-1 transition-all duration-500
    ${isArtist ? 'rounded-full border-4 border-transparent group-hover:border-vert/20' : 'md:rounded-2xl rounded-lg'}
  `,
  IMAGE_RENDER: (isArtist: boolean) => `
    object-cover transition-transform duration-500 
    ${isArtist ? 'group-hover:scale-110' : 'group-hover:scale-105'}
  `,

  // Badge de Rating (Adapté à la petite taille)
  RATING_BADGE: (isArtist: boolean) => `
    absolute z-10
    ${isArtist 
      ? 'bottom-2 left-1/2 -translate-x-1/2' 
      : 'bg-black/60 backdrop-blur-md border border-white/10 top-0.75 right-0.75 md:top-2 md:right-2 px-0.75 md:px-1.5 py-0.37 rounded-md'}
  `,
  RATING_TEXT: (rating: number, isActive: boolean) => {
    const color = rating >= 1.35 ? `${GENERAL_STYLES.TEXT2}`  : rating >= 0.8 ? 'text-jaune' : 'text-rouge';
    return `${isActive ? 'font-bold' : 'font-medium'} ${color} text-[6px] md:text-xs`;
  },

  // Section Texte
  TEXT_CONTENT: "flex items-center gap-2",
  TITLE: (isArtist: boolean) => `${GENERAL_STYLES.TEXT1} 
    font-bold truncate group-hover:text-vert transition-colors mb-0.5
    ${isArtist ? 'text-center text-[14px]' : 'text-[11px]'}
  `,
  SUBTITLE: `${GENERAL_STYLES.TEXT3} text-[10px] truncate`,

  // Footer Stats (Grille 3 colonnes très serrée)
  FOOTER: "grid grid-cols-3 pt-1.5 mt-1 border-t border-white/5",
  STAT_BLOCK: "flex flex-col items-center",
  STAT_VALUE: (isActive: boolean) => `text-[10px] font-bold leading-tight ${isActive ? `${GENERAL_STYLES.TEXT2}` : `${GENERAL_STYLES.TEXT3}`}`,
  STAT_LABEL: `${GENERAL_STYLES.TEXT3} text-[7px] uppercase tracking-widest font-medium`
};

export default function SmallGridCell({ element, index, sort }: SmallGridCellProps) {
  const isArtist = element.type === 'artist';
  const displayName = element.title || element.name || "Inconnu";
  const displayImage = element.cover || element.image_url;

  const displaySub = () => {
    if (element.type === 'artist') return null;
    if (element.type === 'track') {
      return (
        <>
          {element.artist}
          <span> ● </span>
          <span className="italic opacity-80">{element.album}</span>
        </>
      );
    }
    return element.artist;
  };

  return (
    <div className={SMALL_GRID_STYLES.WRAPPER(isArtist)}>
      {/* BADGE INDEX */}
      <div className={SMALL_GRID_STYLES.INDEX_BADGE}>#{index + 1}</div>
      
      {/* SECTION IMAGE */}
      <div className={SMALL_GRID_STYLES.IMAGE_CONTAINER(isArtist)}>
        {displayImage ? (
          <Image 
            src={displayImage} 
            alt={displayName}
            fill 
            sizes="(max-width: 360px) 20vw, 100px"
            className={SMALL_GRID_STYLES.IMAGE_RENDER(isArtist)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">?</div>
        )}

        {/* Badge Rating */}
        <div className={SMALL_GRID_STYLES.RATING_BADGE(isArtist)}>
          <span className={SMALL_GRID_STYLES.RATING_TEXT(element.rating, sort === "rating")}>
            {element.rating.toLocaleString('fr-FR')} {isArtist && "★"}
          </span>
        </div>
      </div>

      {/* SECTION TEXTE */}
      <div className={SMALL_GRID_STYLES.TEXT_CONTENT}>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className={SMALL_GRID_STYLES.TITLE(isArtist)}>{displayName}</h3>
          {displaySub() && (
            <p className={SMALL_GRID_STYLES.SUBTITLE}>{displaySub()}</p>
          )}
        </div>
      </div>

      {/* FOOTER STATS (Compact) */}
      <div className={SMALL_GRID_STYLES.FOOTER}>
        {/* Streams */}
        <div className={SMALL_GRID_STYLES.STAT_BLOCK}>
          <span className={SMALL_GRID_STYLES.STAT_VALUE(sort === 'play_count')}>
            {element.play_count.toLocaleString('fr-FR')}
          </span>
          <span className={SMALL_GRID_STYLES.STAT_LABEL}>str</span>
        </div>

        {/* Minutes */}
        <div className={SMALL_GRID_STYLES.STAT_BLOCK}>
          {element.total_minutes !== undefined ? (
            <>
              <span className={SMALL_GRID_STYLES.STAT_VALUE(sort === 'total_minutes')}>
                {Math.round(element.total_minutes).toLocaleString('fr-FR')}
              </span>
              <span className={SMALL_GRID_STYLES.STAT_LABEL}>min</span>
            </>
          ) : (<span className="text-gray-400 font-bold text-[10px]">-</span>)}
        </div>

        {/* Engagement */}
        <div className={SMALL_GRID_STYLES.STAT_BLOCK}>
          <span className={SMALL_GRID_STYLES.STAT_VALUE(sort === 'engagement')}>
            {element.engagement.toLocaleString('fr-FR')}
          </span>
          <span className={SMALL_GRID_STYLES.STAT_LABEL}>%</span>
        </div>
      </div>
    </div>
  );
}