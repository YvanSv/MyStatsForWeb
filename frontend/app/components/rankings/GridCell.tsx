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
      ${isArtist ? 'rounded-[2.5rem] p-4 md:p-6 bg-bg2/20' : 'rounded-xl md:rounded-3xl p-2 md:p-4'}
    `}>
      
      {/* SECTION IMAGE */}
      <div className={`relative aspect-square mb-2 md:mb-4 overflow-hidden shadow-2xl bg-bg2/50
        ${isArtist ? 'rounded-full border-4 border-transparent group-hover:border-vert/20' : 'rounded-lg md:rounded-2xl'}
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

        {/* Badge Rating (Optionnel pour artistes ou formaté différemment) */}
        <div className={`absolute bg-black/60 backdrop-blur-md border border-white/10
          ${isArtist ? 'bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full' : 'top-1 right-1 md:top-3 md:right-3 px-1 md:px-2 py-0.5 rounded-md'}
        `}>
          <span className={`font-bold ${element.rating >= 1.35 ? 'text-vert' : element.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} text-[8px] md:text-xs`}>
            {element.rating} {isArtist && "★"}
          </span>
        </div>
      </div>

      {/* SECTION TEXTE */}
      <div className="flex items-center gap-2"> {/* items-center fait tout le travail ici */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className={`font-bold truncate group-hover:text-vert transition-colors mb-0.5
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

        {/* Valeur d'engagement centrée verticalement */}
        <p className={`text-[10px] md:text-xs font-bold shrink-0 ${sort === 'engagement' ? 'text-vert' : 'text-gray-500'}`}>
          {element.engagement}%
        </p>
      </div>

      {/* FOOTER DESKTOP */}
      <div className="hidden md:flex justify-between items-center pt-3 mt-3 border-t border-white/5">
        <span className={`text-[11px] uppercase font-bold ${sort === 'play_count' ? 'text-vert' : 'text-gray-500'}`}>
          {element.play_count} <span className="hidden lg:inline">streams</span>
        </span>
        {element.total_minutes !== undefined && (
           <span className={`text-[11px] uppercase font-bold ${sort === 'total_minutes' ? 'text-vert' : 'text-gray-500'}`}>
            {Math.round(element.total_minutes)} min
          </span>
        )}
        {isArtist && (
           <span className={`text-[11px] uppercase font-bold ${sort === 'engagement' ? 'text-vert' : 'text-gray-500'}`}>
            {element.engagement}%
          </span>
        )}
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