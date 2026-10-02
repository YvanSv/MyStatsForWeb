import { Music } from "lucide-react";
import { useSpotify } from "../../../context/currentlyPlayingContext";
import { useLanguage } from "../../../context/languageContext";
import SpotifyLiveCard from "../../../components/small_elements/SpotifyLiveCard";
import Widget from "../Widget";

/** Écoute en cours. Contenu dynamique (et pochette distante) : exclu de l'image exportée, la case y reste vide. */
export function NowPlayingWidget({ w, h }: { w: number; h: number; data?: unknown }) {
  const { listening, localProgress } = useSpotify();
  const { t } = useLanguage();
  const data = listening?.is_listening ? listening.data : null;

  const card = (size: "xs" | "md") => (
    <div className="w-full h-full flex items-center justify-center p-1 [&>div]:min-w-0 [&>div]:w-full">
      <SpotifyLiveCard isListening data={data} currentProgress={localProgress} size={size}/>
    </div>
  );
  const idle = (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1 text-center">
      <Music size={14} className="text-gray-500" aria-hidden="true"/>
      <span className="text-[7px] italic text-gray-500 leading-tight">{t.api.currentListeningOff}</span>
    </div>
  );
  const compact = data ? (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1 min-w-0">
      {data.cover_url
        ? <img src={data.cover_url} alt="" className="w-10 h-10 rounded-md object-cover"/>
        : <div aria-hidden="true" className="w-10 h-10 rounded-md bg-white/10"/>}
      <span className="w-full text-center text-[8px] font-bold text-white truncate">{data.title}</span>
    </div>
  ) : idle;

  const xs = data ? card("xs") : idle;
  const md = data ? card("md") : idle;
  const layouts = { "1x1": compact, "2x1": xs, "3x1": xs, "2x2": xs, "3x2": md, "3x3": md };

  return (
    <div data-export-ignore="true" className="w-full h-full overflow-hidden">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}
