import { DataInfo } from "@/app/data/DataInfos";
import Image from "next/image";

interface GridCellProps {
  element: DataInfo;
  sort: string;
}

export default function GridCell({ element, sort }: GridCellProps) {
  const isArtist = element.type === 'artist';
  // Normalisation des champs pour éviter les erreurs
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
    <div className={`group bg-bg2/30 backdrop-blur-md border border-white/5 transition-all hover:border-vert/40 hover:-translate-y-1 flex flex-col h-full
      ${isArtist ? 'rounded-xl md:rounded-3xl p-1.5 md:p-4 bg-bg2/20' : 'rounded-xl md:rounded-3xl p-2 md:p-4'}
    `}>
      
      {/* SECTION IMAGE */}
      <div className={`relative aspect-square md:mb-4 overflow-hidden shadow-2xl bg-bg2/50
        ${isArtist ? 'mb-1 rounded-full border-4 border-transparent group-hover:border-vert/20' : 'mb-2 rounded-lg md:rounded-2xl'}
      `}>
        {displayImage ? (
          <Image 
            src={displayImage} 
            alt={displayName}
            fill 
            sizes="(max-width: 640px) 33vw, 200px"
            className={`object-cover transition-transform duration-500 ${isArtist ? 'group-hover:scale-110' : 'group-hover:scale-105'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">?</div>
        )}

        {/* Badge Rating */}
        <div className={`absolute
          ${isArtist ? 'bottom-2 md:bottom-2 left-1/2 -translate-x-1/2 md:px-2 md:py-0.5 md:rounded-full' : 'bg-black/60 backdrop-blur-md border border-white/10 top-1 right-1 md:top-3 md:right-3 px-1 md:px-2 py-0.5 rounded-md'}
        `}>
          <span className={`${sort === "rating" && 'font-bold'} ${element.rating >= 1.35 ? 'text-vert' : element.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} text-[7px] md:text-xs`}>
            {element.rating.toLocaleString('fr-FR')} {isArtist && "★"}
          </span>
        </div>
      </div>

      {/* SECTION TEXTE */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className={`font-bold truncate group-hover:text-vert transition-colors md:mb-0.5
            ${isArtist ? 'text-center text-sm md:text-base' : 'text-[10px] md:text-sm'}
          `}>
            {displayName}
          </h3>
          {displaySub && (
            <p className="text-gray-400 text-[9px] md:text-[11px] truncate mb-1 md:mb-0">
              {displaySub()}
            </p>
          )}
        </div>
      </div>

      {/* FOOTER DESKTOP */}
      <div className="hidden md:grid grid-cols-3 pt-3 mt-3 border-t border-white/5">
        {/* Bloc Streams */}
        <div className="flex flex-col items-center">
          <span className={`text-[12px] font-bold leading-tight ${sort === 'play_count' ? 'text-vert' : 'text-gray-400'}`}>
            {element.play_count.toLocaleString('fr-FR')}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-gray-500 font-medium">str</span>
        </div>

        {/* Bloc Minutes */}
        <div className="flex flex-col items-center">
          {element.total_minutes !== undefined ? (
            <>
              <span className={`text-[12px] font-bold leading-tight ${sort === 'total_minutes' ? 'text-vert' : 'text-gray-400'}`}>
                {Math.round(element.total_minutes).toLocaleString('fr-FR')}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-medium">min</span>
            </>
          ) : (
            <span className="text-gray-400 font-bold">-</span>
          )}
        </div>

        {/* Bloc Engagement */}
        <div className="flex flex-col items-center">
          <span className={`text-[12px] font-bold leading-tight ${sort === 'engagement' ? 'text-vert' : 'text-gray-400'}`}>
            {element.engagement.toLocaleString('fr-FR')}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-gray-500 font-medium">%</span>
        </div>
      </div>

      {/* FOOTER MOBILE */}
      <div className="md:hidden flex justify-between items-center text-[8px] font-bold uppercase border-t border-white/5 pt-1 mt-auto">
        <span className={sort === 'play_count' ? 'text-vert' : 'text-gray-500'}>{element.play_count}</span>
        {element.total_minutes !== undefined && (
          <span className={sort === 'total_minutes' ? 'text-vert' : 'text-gray-500'}>{Math.round(element.total_minutes)}m</span>
        )}
        <span className={sort === 'engagement' ? 'text-vert' : 'text-gray-500'}>{element.engagement}%</span>
      </div>
    </div>
  );
}