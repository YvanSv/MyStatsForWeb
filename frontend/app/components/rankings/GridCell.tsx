import { DataInfo } from "@/app/data/DataInfos";
import Image from "next/image";

interface GridCellProps {
  element: DataInfo;
  index: number;
  sort: string;
}

const GRID_CELL_STYLES = {
  // Conteneur principal
  WRAPPER: (isArtist: boolean) => `
    group bg-bg2/30 backdrop-blur-md border border-white/5 transition-all 
    hover:border-vert/40 hover:-translate-y-1 flex flex-col h-full relative
    ${isArtist ? 'rounded-xl md:rounded-3xl p-1.5 md:p-4 bg-bg2/20' : 'rounded-xl md:rounded-3xl p-2 md:p-4'}
  `,

  // Badge d'index (#1, #2...)
  INDEX_BADGE: `absolute top-3 left-3 md:top-4.5 md:left-4.5 z-10 flex items-center justify-center 
                min-w-[20px] h-[20px] px-1.5 rounded-full text-[12px] md:text-[15px] 
                font-black text-white/40 group-hover:text-vert transition-colors`,

  // Section Image
  IMAGE_CONTAINER: (isArtist: boolean) => `
    relative aspect-square overflow-hidden shadow-2xl bg-bg2/50 transition-all duration-500
    ${isArtist ? 'mb-1 md:mb-4 rounded-full border-4 border-transparent group-hover:border-vert/20' : 'mb-2 md:mb-4 rounded-lg md:rounded-2xl'}
  `,
  IMAGE_RENDER: (isArtist: boolean) => `
    object-cover transition-transform duration-500 
    ${isArtist ? 'group-hover:scale-110' : 'group-hover:scale-105'}
  `,

  // Badge de Rating
  RATING_BADGE: (isArtist: boolean) => `
    absolute z-10
    ${isArtist 
      ? 'bottom-2 left-1/2 -translate-x-1/2 md:px-2 md:py-0.5 md:rounded-full bg-black/40 backdrop-blur-sm' 
      : 'bg-black/60 backdrop-blur-md border border-white/10 top-1 right-1 md:top-3 md:right-3 px-1 md:px-2 py-0.5 rounded-md'}
  `,
  RATING_TEXT: (rating: number, isActive: boolean) => {
    const color = rating >= 1.35 ? 'text-vert' : rating >= 0.8 ? 'text-jaune' : 'text-rouge';
    return `${isActive ? 'font-black' : 'font-medium'} ${color} text-[7px] md:text-xs tracking-tighter`;
  },

  // Section Texte
  TEXT_CONTENT: "flex items-center gap-2",
  TITLE: (isArtist: boolean) => `
    font-bold truncate group-hover:text-vert transition-colors md:mb-0.5
    ${isArtist ? 'text-center text-sm md:text-base' : 'text-[10px] md:text-sm'}
  `,
  SUBTITLE: "text-gray-400 text-[9px] md:text-[11px] truncate mb-1 md:mb-0",

  // Footer Desktop (Stats)
  FOOTER_PC: "hidden md:grid grid-cols-3 pt-3 mt-3 border-t border-white/5",
  STAT_BLOCK: "flex flex-col items-center",
  STAT_VALUE: (isActive: boolean) => `text-[12px] font-bold leading-tight ${isActive ? 'text-vert' : 'text-gray-400'}`,
  STAT_LABEL: "text-[9px] uppercase tracking-widest text-gray-500 font-medium",

  // Footer Mobile
  FOOTER_MOBILE: "md:hidden flex justify-between items-center text-[8px] font-bold uppercase border-t border-white/5 pt-1 mt-auto",
  MOBILE_VALUE: (isActive: boolean) => isActive ? 'text-vert' : 'text-gray-500'
};

export default function GridCell({ element, index, sort }: GridCellProps) {
  const isArtist = element.type === 'artist';
  const displayName = element.title || element.name || "Inconnu";
  const displayImage = element.cover || element.image_url;

  const displaySub = () => {
    if (element.type === 'artist') return null;
    if (element.type === 'track') {
      return (
        <>
          {element.artist}
          <span className="hidden md:inline"> ● </span>
          <span className="hidden md:inline italic opacity-80">{element.album}</span>
        </>
      );
    }
    return element.artist;
  };

  return (
    <div className={GRID_CELL_STYLES.WRAPPER(isArtist)}>
      {/* BADGE INDEX */}
      <div className={GRID_CELL_STYLES.INDEX_BADGE}>#{index + 1}</div>
      
      {/* SECTION IMAGE */}
      <div className={GRID_CELL_STYLES.IMAGE_CONTAINER(isArtist)}>
        {displayImage ? (
          <Image 
            src={displayImage} 
            alt={displayName}
            fill 
            sizes="(max-width: 640px) 33vw, 200px"
            className={GRID_CELL_STYLES.IMAGE_RENDER(isArtist)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">?</div>
        )}

        {/* Badge Rating */}
        <div className={GRID_CELL_STYLES.RATING_BADGE(isArtist)}>
          <span className={GRID_CELL_STYLES.RATING_TEXT(element.rating, sort === "rating")}>
            {element.rating.toLocaleString('fr-FR')} {isArtist && "★"}
          </span>
        </div>
      </div>

      {/* SECTION TEXTE */}
      <div className={GRID_CELL_STYLES.TEXT_CONTENT}>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className={GRID_CELL_STYLES.TITLE(isArtist)}>{displayName}</h3>
          {displaySub() && (
            <p className={GRID_CELL_STYLES.SUBTITLE}>{displaySub()}</p>
          )}
        </div>
      </div>

      {/* FOOTER DESKTOP */}
      <div className={GRID_CELL_STYLES.FOOTER_PC}>
        <div className={GRID_CELL_STYLES.STAT_BLOCK}>
          <span className={GRID_CELL_STYLES.STAT_VALUE(sort === 'play_count')}>
            {element.play_count.toLocaleString('fr-FR')}
          </span>
          <span className={GRID_CELL_STYLES.STAT_LABEL}>str</span>
        </div>

        <div className={GRID_CELL_STYLES.STAT_BLOCK}>
          {element.total_minutes !== undefined ? (
            <>
              <span className={GRID_CELL_STYLES.STAT_VALUE(sort === 'total_minutes')}>
                {Math.round(element.total_minutes).toLocaleString('fr-FR')}
              </span>
              <span className={GRID_CELL_STYLES.STAT_LABEL}>min</span>
            </>
          ) : (<span className="text-gray-400 font-bold">-</span>)}
        </div>

        <div className={GRID_CELL_STYLES.STAT_BLOCK}>
          <span className={GRID_CELL_STYLES.STAT_VALUE(sort === 'engagement')}>
            {element.engagement.toLocaleString('fr-FR')}
          </span>
          <span className={GRID_CELL_STYLES.STAT_LABEL}>%</span>
        </div>
      </div>

      {/* FOOTER MOBILE */}
      <div className={GRID_CELL_STYLES.FOOTER_MOBILE}>
        <span className={GRID_CELL_STYLES.MOBILE_VALUE(sort === 'play_count')}>
          {element.play_count}
        </span>
        {element.total_minutes !== undefined && (
          <span className={GRID_CELL_STYLES.MOBILE_VALUE(sort === 'total_minutes')}>
            {Math.round(element.total_minutes)}m
          </span>
        )}
        <span className={GRID_CELL_STYLES.MOBILE_VALUE(sort === 'engagement')}>
          {element.engagement}%
        </span>
      </div>
    </div>
  );
}