import { DataInfo } from "@/app/data/DataInfos";
import Image from "next/image";

interface SmallGridCellProps {
  element: DataInfo;
  index: number;
  sort: string;
}

export default function SmallGridCell({ element, index, sort }: SmallGridCellProps) {
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
          <span> ● </span>
          <span className="italic opacity-80">{element.album}</span>
        </>
      );
    }
    return element.artist;
  };

  return (
    <div className={`group bg-bg2/30 backdrop-blur-md border border-white/5 transition-all hover:border-vert/40 hover:-translate-y-1 flex flex-col h-full rounded-3xl
      ${isArtist ? 'p-2.5 bg-bg2/20' : 'p-3 pb-1.5'}
    `}>
      {/* BADGE INDEX */}
      <div className={`absolute top-3 left-3 z-10 flex items-center justify-center 
        min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-black text-gray-300
      `}>#{index + 1}</div>
      
      {/* SECTION IMAGE */}
      <div className={`relative aspect-square overflow-hidden shadow-2xl bg-bg2/50 mb-1
        ${isArtist ? 'rounded-full border-4 border-transparent group-hover:border-vert/20' : 'md:rounded-2xl rounded-lg'}
      `}>
        {displayImage ? (
          <Image 
            src={displayImage} 
            alt={displayName}
            fill 
            sizes="(max-width: 360px) 20vw, 100px"
            className={`object-cover transition-transform duration-500 ${isArtist ? 'group-hover:scale-110' : 'group-hover:scale-105'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">?</div>
        )}

        {/* Badge Rating */}
        <div className={`absolute
          ${isArtist ? 'bottom-2 left-1/2 -translate-x-1/2' : 'bg-black/60 backdrop-blur-md border border-white/10 top-0.75 right-0.75 md:top-2 md:right-2 px-0.75 md:px-1.5 py-0.37 rounded-md'}
        `}>
          <span className={`${sort === "rating" && 'font-bold'} ${element.rating >= 1.35 ? 'text-vert' : element.rating >= 0.8 ? 'text-jaune' : 'text-rouge'} text-[6px] md:text-xs`}>
            {element.rating.toLocaleString('fr-FR')} {isArtist && "★"}
          </span>
        </div>
      </div>

      {/* SECTION TEXTE */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className={`font-bold truncate group-hover:text-vert transition-colors mb-0.5
            ${isArtist ? 'text-center text-[14px]' : 'text-[11px]'}
          `}>
            {displayName}
          </h3>
          {displaySub && (
            <p className="text-gray-400 text-[10px] truncate">
              {displaySub()}
            </p>
          )}
        </div>
      </div>

      {/* FOOTER DESKTOP */}
      <div className="grid grid-cols-3 pt-1.5 mt-1 border-t border-white/5">
        {/* Bloc Streams */}
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-bold leading-tight ${sort === 'play_count' ? 'text-vert' : 'text-gray-400'}`}>
            {element.play_count.toLocaleString('fr-FR')}
          </span>
          <span className="text-[7px] uppercase tracking-widest text-gray-500 font-medium">str</span>
        </div>

        {/* Bloc Minutes */}
        <div className="flex flex-col items-center">
          {element.total_minutes !== undefined ? (
            <>
              <span className={`text-[10px] font-bold leading-tight ${sort === 'total_minutes' ? 'text-vert' : 'text-gray-400'}`}>
                {Math.round(element.total_minutes).toLocaleString('fr-FR')}
              </span>
              <span className="text-[7px] uppercase tracking-widest text-gray-500 font-medium">min</span>
            </>
          ) : (<span className="text-gray-400 font-bold">-</span>)}
        </div>

        {/* Bloc Engagement */}
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-bold leading-tight ${sort === 'engagement' ? 'text-vert' : 'text-gray-400'}`}>
            {element.engagement.toLocaleString('fr-FR')}
          </span>
          <span className="text-[7px] uppercase tracking-widest text-gray-500 font-medium">%</span>
        </div>
      </div>
    </div>
  );
}