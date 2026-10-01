import { LoadingSpinner } from "@/app/components/small_elements/CustomSpinner";
import { useLanguage } from "@/app/context/languageContext";

const TOP_ITEMS_STYLES = {
  CARD: "group relative flex items-center gap-2 md:gap-3 lg:gap-4 p-2 md:p-3 lg:p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300",
  IMAGE_WRAPPER: "relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 overflow-hidden rounded-xl shadow-lg",
  IMAGE: "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
  CONTENT: "flex flex-col min-w-0 h-14 md:h-16 lg:h-20 justify-between",
  LABEL: "text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1 opacity-80",
  TITLE: "text-sm font-bold text-white truncate",
  SUBTITLE: "text-xs text-gray-400 truncate",
  ALBUM: "text-[11px] text-gray-500 truncate mt-0.5 italic"
};

export default function TopMediaCard({label,item,loading,type,metric}:
  {label:string,item:any,loading:boolean,type:'track'|'album'|'artist',metric:string})
{
  const { t } = useLanguage();
  // Selon la métrique, l'élément à afficher est le premier (minutes) ou le second (streams) du couple renvoyé par l'API
  const shown = metric === 'minutes' ? item?.[0] : item?.[1];
  return (
    <div className={TOP_ITEMS_STYLES.CARD}>
      <div className={TOP_ITEMS_STYLES.IMAGE_WRAPPER}>
        {loading ? <LoadingSpinner /> : (
          <img 
            src={shown?.image || "/default-cover.png"} 
            alt={label} 
            className={TOP_ITEMS_STYLES.IMAGE} 
          />
        )}
      </div>
      <div className={TOP_ITEMS_STYLES.CONTENT}>
        <span className={TOP_ITEMS_STYLES.LABEL}>{label}</span>
        <div className="flex flex-col min-w-0">
          <h4 className={TOP_ITEMS_STYLES.TITLE}>{loading ? "..." : (shown?.name || t.dashboard.none)}</h4>
          <p className={TOP_ITEMS_STYLES.SUBTITLE}>
            {loading ? "..." : shown?.artist}
            {!loading && type === 'track' && (
              <span className="hidden md:inline"> ● <span className={TOP_ITEMS_STYLES.ALBUM}>{shown?.album}</span></span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};