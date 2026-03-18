export interface SpotifyListeningData {
    title: string;
    progress_ms: number;
    duration_ms: number;
    album_name: string;
    artist_name: string;
    cover_url: string;
}

export default function SpotifyLiveCard({isListening,data,currentProgress}:{isListening:boolean,data:SpotifyListeningData,currentProgress: number}) {
  const progress = data ? (currentProgress / data.duration_ms) * 100 : 0;

  if (!isListening || !data) {
    return (
      <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex items-center justify-center min-h-[120px] backdrop-blur-md">
        <p className="text-gray-500 italic text-sm tracking-wide">
          Aucune musique en cours sur Spotify
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/40 border border-white/10 p-5 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:border-green-500/30">
      
      {/* Background Glow (Lueur dynamique basée sur l'album) */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/10 blur-[80px] rounded-full"></div>

      <div className="relative flex items-center gap-5">
        
        {/* Pochette d'album avec effet de rotation si lecture */}
        <div className="relative flex-shrink-0">
          <img 
            src={data.cover_url} 
            alt={data.album_name}
            className={`w-20 h-20 rounded-xl shadow-lg object-cover ${isListening ? 'animate-pulse' : ''}`}
          />
          {/* Badge Live */}
          <div className="absolute -top-2 -left-2 bg-green-500 text-[10px] font-black px-2 py-0.5 rounded-full text-black uppercase tracking-tighter">
            Live
          </div>
        </div>

        {/* Infos Titre / Artiste */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg truncate leading-tight mb-1">
            {data.title}
          </h3>
          <p className="text-gray-400 text-sm truncate">
            {data.artist_name} • <span className="text-gray-500 italic">{data.album_name}</span>
          </p>
          
          {/* Barre de progression */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
              <span>{formatMs(currentProgress)}</span>
              <span>{formatMs(data.duration_ms)}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Animation Equalizer (en haut à droite) */}
        <div className="flex gap-1 items-end h-4 mb-12">
            {[1, 2, 3].map((i) => (
                <div key={i} className={`w-1 bg-green-500 rounded-full animate-bounce`} 
                     style={{ animationDuration: `${0.5 + i/5}s`, height: `${30 + (i*20)}%` }}></div>
            ))}
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