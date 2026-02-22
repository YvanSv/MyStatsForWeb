import Image from "next/image";
import { DataInfo } from "@/app/data/DataInfos";

interface ListCellProps {
  element: DataInfo;
  index: number;
  sort: string;
}

export default function ListCell({ element, index, sort }: ListCellProps) {
  const isArtist = element.type === 'artist';
  const displayName = element.title || element.name || "Inconnu";
  const displayImage = element.cover || element.image_url;

  const displaySub = () => {
    if (element.type === 'artist') return null;
    if (element.type === 'track') {
      return (
        <>
          {element.artist} ●
          <span className="italic opacity-80"> {element.album}</span>
        </>
      );
    }
    return element.artist;
  };

  // Logique de la stat dynamique (Mobile)
  const renderMobileStat = () => {
    if (sort === 'rating') return <div className="h-5 md:hidden" />;
    
    let value: string | number = "";
    let unit = "";

    switch (sort) {
      case 'play_count':
        value = element.play_count;
        unit = "STR";
        break;
      case 'engagement':
        value = `${element.engagement}%`;
        unit = "";
        break;
      case 'total_minutes':
      default:
        value = Math.round(element.total_minutes || 0);
        unit = "MIN";
        break;
    }

    return (
      <div className="font-hias font-bold text-sm text-vert lg:text-gray-300 lg:font-normal">
        {value}<span className="text-[8px] ml-1 lg:hidden opacity-70">{unit}</span>
      </div>
    );
  };

  return (
    <div className="group flex lg:grid lg:grid-cols-[40px_2fr_120px_120px_140px_100px_60px] items-center gap-3 md:gap-4 bg-bg2/30 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1">
      
      {/* Index */}
      <div className="sm:block text-gray-500 font-mono text-sm md:text-lg">#{index + 1}</div>
      
      {/* Contenu Principal (Image + Titres) */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div className={`relative h-12 w-12 md:h-14 md:w-14 flex-shrink-0 overflow-hidden shadow-lg bg-bg2 border border-white/10 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}>
          {displayImage ? (
            <Image src={displayImage} alt={displayName} fill sizes="56px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">?</div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-sm md:text-base truncate group-hover:text-vert transition-colors">{displayName}</h3>
          {!isArtist && (
            <p className="text-gray-400 text-[10px] md:text-xs truncate">
              {displaySub()}
            </p>
          )}
        </div>
      </div>

      {/* COLONNES DESKTOP */}
      <div className={`hidden lg:block text-center ${sort !== 'play_count' ? 'text-sm text-gray-400' : 'text-medium font-bold text-vert'}`}>
        {element.play_count} <span className="font-medium text-[10px]">str</span>
      </div>

      <div className={`hidden lg:block text-center ${sort !== 'total_minutes' ? 'text-sm text-gray-400' : 'text-medium font-bold text-vert'}`}>
        {Math.round(element.total_minutes || 0)} <span className="font-medium text-[10px]">min</span>
      </div>

      <div className="hidden lg:flex justify-center">
        <div className="flex items-center gap-2">
          <span className={`${sort !== 'engagement' ? 'text-sm text-gray-400' : 'font-bold text-vert'}`}>{element.engagement}%</span>
          <div className="w-12 h-1 bg-rouge/50 rounded-full overflow-hidden">
            <div className={`h-full ${sort !== 'engagement' ? 'bg-gray-400' : 'bg-vert'}`} style={{ width: `${element.engagement}%` }} />
          </div>
        </div>
      </div>
      
      {/* BLOC DROITE (Mobile Dynamic Stat + Rating Universel) */}
      <div className="flex flex-col items-end md:items-center justify-center gap-0.5 min-w-[70px] md:min-w-0">
        <div className="lg:hidden">
          {renderMobileStat()}
        </div>
        <div className={`text-xs text-right md:text-base w-full lg:text-center ${sort !== 'rating' ? 'text-sm' : 'font-bold'} ${element.rating >= 1.35 ? 'text-vert' : element.rating >= 0.8 ? 'text-jaune' : 'text-rouge'}`}>
          {element.rating}★
        </div>
      </div>
    </div>
  );
}