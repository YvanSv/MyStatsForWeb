import { Clock, Mic2, Play, Trophy } from "lucide-react";

type SortOption = "streams" | "minutes" | "rating";

interface DataFormat {
  topArtists: any[];
  topTracks: any[];
  topAlbums: any[];
  minutes: number;
  streams: number;
}

const RESUME_STYLES = {
  CARD: "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 pr-3 backdrop-blur-md",
  GRADIENT_GREEN: "bg-gradient-to-br from-vert-500/20 via-transparent to-transparent",
  GRADIENT_RED: "bg-gradient-to-br from-red-500/20 via-transparent to-transparent",
  LABEL: "text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1",
  VALUE: "text-3xl font-black text-white italic",
};

export function DesignCard({resumeData,t,sort,range}:{resumeData:DataFormat,t:any,sort:SortOption,range:string|number}) {
  return (
    <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4">
      {/* ARTISTES */}
      <RankingItemCell dict={t.resume} top1={resumeData.topArtists[0]} top2_5={resumeData.topArtists.slice(1, 5)} color="blue" sort={sort}/>
      {/* TRACKS */}
      <RankingItemCell dict={t.resume} top1={resumeData.topTracks[0]} top2_5={resumeData.topTracks.slice(1, 5)} color="purple" sort={sort}/>
      {/* ALBUMS */}
      <RankingItemCell dict={t.resume} top1={resumeData.topAlbums[0]} top2_5={resumeData.topAlbums.slice(1, 5)} color="red" sort={sort}/>
      {/* MINUTES TOTALES */}
      <div className={`${RESUME_STYLES.CARD} flex flex-col justify-between`}>
        <div className={"bg-gradient-to-br from-yellow-500/20 via-transparent to-transparent absolute inset-0"}/>
        <Clock className="text-yellow-400 mb-4 relative z-10" size={24}/>
        <div className="relative z-10">
          <p className={RESUME_STYLES.LABEL}>{t.resume.totalTime || "Temps d'écoute"}</p>
          <p className={RESUME_STYLES.VALUE}>{resumeData.minutes.toLocaleString()} <span className="text-sm font-bold opacity-50">MIN</span></p>
        </div>
      </div>
      {/* STREAMS TOTAUX */}
      <div className={`${RESUME_STYLES.CARD} flex flex-col justify-between`}>
        <div className={"bg-gradient-to-br from-vert/20 via-transparent to-transparent absolute inset-0"}/>
        <Play className="text2 mb-4 relative z-10" size={24}/>
        <div className="relative z-10">
          <p className={RESUME_STYLES.LABEL}>{t.resume.totalStreams || "Nombre de streams"}</p>
          <p className={RESUME_STYLES.VALUE}>{resumeData.streams.toLocaleString()} <span className="text-sm font-bold opacity-50">STREAMS</span></p>
        </div>
      </div>
      {/* BRANDING */}
      <div className={`${RESUME_STYLES.CARD} flex items-center justify-center border-dashed border-white/20`}>
        <div className="text-center opacity-40">
          <p className="text-[12px] m-3 uppercase font-medium">{range}</p>
          <p className="text-[12px] font-black uppercase tracking-[0.5em]">Generated with MyStats</p>
        </div>
      </div>
    </div>
  );
}

function RankingItemCell({dict,top1,top2_5,color,sort}:any) {
  return (
    <div className={`${RESUME_STYLES.CARD} col-span-3 flex flex-col md:flex-row justify-between min-h-[200px]`}>
      <div className={`bg-gradient-to-br from-${color}-500/20 via-transparent to-transparent absolute inset-0`}/>

      {/* Image Centrale (Le Vainqueur) */}
      <div className="hidden lg:block absolute left-2/5 top-4/9 -translate-x-1/2 -translate-y-1/2 z-20">
        <img src={top1.image} alt={top1.name}className="w-50 h-50 object-cover rounded-full border border-white/20 shadow-2xl"/>
      </div>

      {/* Mettre en valeur le N°1 */}
      <div className="relative z-30 flex flex-col justify-between flex-grow">
        <Trophy className={`text-${color}-400 mb-4`} size={32}/>
        <div className='z-10'>
          <p className={RESUME_STYLES.LABEL}>{dict.topArtist || "Artiste n°1"}</p>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none truncate max-w-[475px]">{top1.name}</h2>
          <div className="mt-2 flex items-center gap-2 text-xs text-vert font-medium">
            <Mic2 size={14}/> Avec {sort === "streams" ? top1.streams.toLocaleString() : sort === "minutes" ? top1.minutes.toLocaleString() : (Math.round(top1.rating*100)/100).toLocaleString()}{sort === "rating" ? "★" : " "+sort}
          </div>
        </div>
      </div>

      {/* Liste des 4 artistes suivants */}
      <div className="relative flex-shrink-0 w-full md:w-64 p-3 rounded-2xl bg-white/2 border border-white/10 space-y-3">
        {/* <p className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">Suivants</p> */}
        {top2_5.map((artist, index) => (
          <div key={artist.name} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-500 text-xs font-bold">
              {index + 2}
            </div>
            <div className="flex-grow">
              <p className="text-sm font-semibold text-white leading-tight truncate max-w-[140px]">{artist.name}</p>
              <p className="text-xs text-gray-600">{sort === "streams" ? artist.streams.toLocaleString() : sort === "minutes" ? artist.minutes.toLocaleString() : (Math.round(artist.rating*100)/100).toLocaleString()}{sort === "rating" ? "★" : " "+sort}</p>
            </div>
            {/* Image à l'extrémité droite */}
            <div className="relative flex-shrink-0">
              <img src={artist.image} alt={artist.name}
                className="w-10 h-10 rounded-full object-cover border border-white/10 transition-all duration-300"
              />
              {/* Petit reflet discret */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}