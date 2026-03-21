import Image from "next/image";
import { DataInfo } from "@/app/data/DataInfos";
import { useLanguage } from "@/app/context/languageContext";

interface ListCellProps {
  element: DataInfo;
  index: number;
  sort: string;
}

const LIST_CELL_STYLES = {
  // Conteneur de la ligne
  WRAPPER: `group flex lg:grid lg:grid-cols-[45px_2fr_120px_120px_140px_100px_60px] 
            items-center gap-3 md:gap-4 bg-bg2/25 backdrop-blur-sm px-2 py-1.5 rounded-2xl 
            border border-white/5 hover:border-vert/30 transition-all hover:translate-x-1`,

  // Index (#1, #2...)
  INDEX: `text3 sm:block font-mono text-sm md:text-lg`,

  // Image & Titres
  CONTENT_BLOCK: "flex items-center gap-3 md:gap-4 flex-1 min-w-0",
  IMAGE_CONTAINER: (isArtist: boolean) => `
    relative h-12 w-12 md:h-14 md:w-14 flex-shrink-0 overflow-hidden shadow-lg 
    bg-bg2 border border-white/10 ${isArtist ? 'rounded-full' : 'rounded-lg'}
  `,
  TITLE: "font-bold text-sm md:text-base truncate group-hover:text-vert transition-colors",
  SUBTITLE: `text3 text-[10px] md:text-xs truncate`,

  // Colonnes Desktop (Stats)
  COLUMN_DESKTOP: (isActive: boolean) => `
    hidden lg:block text-center transition-colors
    ${isActive ? `text2 text-medium font-bold` : `text3 text-sm`}
  `,
  
  // Barre d'engagement
  ENGAGEMENT_BAR_CONTAINER: "w-12 h-1 bg-rouge/50 rounded-full overflow-hidden",
  ENGAGEMENT_BAR_FILL: (isActive: boolean) => `h-full ${isActive ? 'bg-vert' : 'bg-gray-400'}`,

  // Bloc de droite (Mobile & Rating)
  RIGHT_BLOCK: "flex flex-col items-end md:items-center justify-center gap-0.5 min-w-[70px] md:min-w-0",
  MOBILE_STAT_CONTAINER: `text2 font-bold text-sm lg:text-gray-300 lg:font-normal`,
  
  // Rating (Couleurs conditionnelles)
  RATING: (rating: number, isActive: boolean) => {
    const color = rating >= 1.35 ? `text2` : rating >= 0.8 ? 'text-jaune' : 'text-rouge';
    return `text-xs text-right md:text-base w-full lg:text-center ${color} ${isActive ? 'font-bold' : 'text-sm'}`;
  }
};

export default function ListCell({ element, index, sort }: ListCellProps) {
  const { t } = useLanguage();
  const dict = t.smallgridcell;
  const isArtist = element.type === 'artist';
  const displayName = element.title || element.name || dict.unknown;
  const displayImage = element.cover || element.image_url;

  const displaySub = () => {
    if (isArtist) return null;
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

  const renderMobileStat = () => {
    if (sort === 'rating') return <div className="h-5 md:hidden"/>;
    
    const config = {
      play_count: { val: element.play_count, unit: "STR" },
      engagement: { val: `${element.engagement}%`, unit: "" },
      total_minutes: { val: Math.round(element.total_minutes || 0), unit: "MIN" }
    };

    const current = config[sort as keyof typeof config] || config.total_minutes;

    return (
      <div className={LIST_CELL_STYLES.MOBILE_STAT_CONTAINER}>
        {current.val}<span className="text-[8px] ml-1 lg:hidden opacity-70">{current.unit}</span>
      </div>
    );
  };

  return (
    <div className={LIST_CELL_STYLES.WRAPPER}>
      
      {/* Index */}
      <div className={LIST_CELL_STYLES.INDEX}>#{index + 1}</div>
      
      {/* Contenu Principal */}
      <div className={LIST_CELL_STYLES.CONTENT_BLOCK}>
        <div className={LIST_CELL_STYLES.IMAGE_CONTAINER(isArtist)}>
          {displayImage ? <Image src={displayImage} alt={displayName} fill sizes="56px" className="object-cover"/>
          : <div className={`text3 w-full h-full flex items-center justify-center`}>?</div>}
        </div>
        <div className="min-w-0">
          <h3 className={LIST_CELL_STYLES.TITLE}>{displayName}</h3>
          {!isArtist && <p className={LIST_CELL_STYLES.SUBTITLE}>{displaySub()}</p>}
        </div>
      </div>

      {/* COLONNES DESKTOP */}
      <div className={LIST_CELL_STYLES.COLUMN_DESKTOP(sort === 'play_count')}>
        {element.play_count.toLocaleString(dict.locale)} <span className="text-[10px]">{dict.unitStreams}</span>
      </div>

      <div className={LIST_CELL_STYLES.COLUMN_DESKTOP(sort === 'total_minutes')}>
        {Math.round(element.total_minutes || 0).toLocaleString(dict.locale)} <span className="text-[10px]">{dict.unitMinutes}</span>
      </div>

      <div className="hidden lg:flex justify-center">
        <div className="flex items-center gap-2">
          <span className={sort === 'engagement' ? `text2 font-bold` : `text3 text-sm`}>
            {element.engagement.toLocaleString(dict.locale)}%
          </span>
          <div className={LIST_CELL_STYLES.ENGAGEMENT_BAR_CONTAINER}>
            <div 
              className={LIST_CELL_STYLES.ENGAGEMENT_BAR_FILL(sort === 'engagement')} 
              style={{ width: `${element.engagement}%` }} 
            />
          </div>
        </div>
      </div>
      
      {/* BLOC DROITE */}
      <div className={LIST_CELL_STYLES.RIGHT_BLOCK}>
        <div className="lg:hidden">{renderMobileStat()}</div>
        <div className={LIST_CELL_STYLES.RATING(element.rating, sort === 'rating')}>
          {element.rating.toLocaleString(dict.locale)}★
        </div>
      </div>
    </div>
  );
}