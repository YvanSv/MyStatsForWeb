import { SpotifyListeningData, useSpotify } from "@/app/context/currentlyPlayingContext";
// import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

const configOptions = {
  xs: {
    container: "p-3 rounded-2xl",
    image: "w-12 h-12 rounded-lg",
    title: "text-sm",
    artist: "text-[11px]",
    gap: "gap-3",
    gap_controls: "gap-2",
    hideExtra: true,
    showProgress: true,
    minWidth: "min-w-[200px]"
  },
  md: {
    container: "p-5 rounded-3xl",
    image: "w-20 h-20 rounded-xl",
    title: "text-lg",
    artist: "text-sm",
    gap: "gap-5",
    gap_controls: "gap-3",
    hideExtra: false,
    showProgress: true,
    minWidth: "min-w-[350px]"
  },
  lg: {
    container: "p-8 rounded-[40px]",
    image: "w-32 h-32 rounded-2xl",
    title: "text-2xl",
    artist: "text-base",
    gap: "gap-8",
    gap_controls: "gap-4",
    hideExtra: false,
    showProgress: true,
    minWidth: "min-w-[450px]"
  }
};

export default function SpotifyLiveCard({
  isListening,
  data,
  currentProgress,
  size = 'md'
}: {
  isListening: boolean,
  data: SpotifyListeningData | null,
  currentProgress: number,
  size: 'xs' | 'md' | 'lg'
}) {
  // const { pause, resume, next, previous } = useSpotify();
  const progress = data ? (currentProgress / data.duration_ms) * 100 : 0;
  const config = configOptions[size];

  if (!data) {
    return (
      <div className={`${config.container} bg-white/5 border border-white/10 flex items-center justify-center min-h-[80px] backdrop-blur-md`}>
        <p className="text-gray-500 italic text-xs tracking-wide">Silence radio sur Spotify</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${config.container} bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-green-500/30 ${config.minWidth}`}>
      
      {/* Background Glow dynamique */}
      <div className={`absolute -right-10 -top-10 ${size === 'lg' ? 'w-64 h-64' : 'w-40 h-40'} bg-green-500/10 blur-[80px] rounded-full`}></div>

      <div className={`relative flex items-center ${config.gap}`}>
        
        {/* Pochette d'album */}
          <img 
            src={data.cover_url} 
            alt={data.album_name}
            className={`${config.image} shadow-lg object-cover$`}
          />

        {/* Infos Titre / Artiste */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-white font-bold truncate leading-tight ${config.title}`}>
            {data.title}
          </h3>
          <div className="relative flex-shrink-0">
            <p className={`text-gray-400 truncate mt-0.5 ${config.artist}`}>
              {data.artist_name} 
              {!config.hideExtra && <span className="text-gray-500 italic font-light"> • {data.album_name}</span>}
            </p>
            {/* Animation Equalizer */}
            <div className={`shadow-lg object-cover absolute top-0 right-0 flex gap-1 items-end ${size === 'lg' ? 'h-8 mb-16' : 'h-4 mb-12'}`}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-1 bg-green-500 rounded-full animate-bounce" 
                  style={{ animationDuration: `${0.5 + i/5}s`, height: `${30 + (i*20)}%` }}></div>
              ))}
            </div>
          </div>
          
          {/* Barre de progression */}
          {config.showProgress && (
            <div className={`${size === 'xs' ? 'mt-2' : 'mt-4'}`}>
              <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono opacity-80">
                <span>{formatMs(currentProgress)}</span>
                {/*<div className={`flex ${config.gap_controls}`}>
                  <span className="transition-colors duration-150 hover:text-white" onClick={previous}><SkipBack size={16}/></span>
                  <span className="transition-colors duration-150 hover:text-white" onClick={isListening ? pause : resume}>
                    {isListening ? <Pause size={16}/> : <Play size={16}/>}
                  </span>
                  <span className="transition-colors duration-150 hover:text-white" onClick={next}><SkipForward size={16}/></span>
                </div>*/}
                <span>{formatMs(data.duration_ms)}</span>
              </div>
              <div className={`${size === 'xs' ? 'h-1' : 'h-1.5'} w-full bg-white/10 rounded-full overflow-hidden`}>
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utilitaire de formatage (03:45)
function formatMs(ms:number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}