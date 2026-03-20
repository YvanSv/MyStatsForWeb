import { TopStatCardProps } from "@/app/data/DataInfos";

export function HorizontalTopSection({ title, items }: { title: string, items: any[] }) {
  return (
    <section className="flex flex-col gap-4 my-12">
      {/* Header de la section */}
      <div className="flex justify-between items-end px-2">
        <h2 className="text1 text-xl font-bold tracking-tight">{title}</h2>
        <span className="text-sm text-vert font-semibold cursor-pointer hover:underline opacity-80">
          Voir plus
        </span>
      </div>

      {/* Conteneur de scroll horizontal */}
      <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="flex-shrink-0 w-[100px] md:w-[120px] snap-start group cursor-pointer"
          >
            {/* Image avec Overlay de Rank */}
            <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-lg border border-white/5">
              <img 
                src={item.image_url}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110`} 
                alt={item.name} 
              />
              {/* Badge de classement */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                <span className="text-[10px] font-mono font-bold text-white">#{index + 1}</span>
              </div>
              {/* Overlay Play au hover */}
              {/* <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <div className="w-12 h-12 bg-vert rounded-full flex items-center justify-center shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform">
                    <span className="text-bg1 ml-1">▶</span>
                 </div>
              </div> */}
            </div>

            {/* Légendes */}
            <div className="space-y-1">
              <p className="text1 font-bold truncate group-hover:text-vert transition-colors">{item.name}</p>
              <p className="text3 text-xs truncate opacity-60 font-medium">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatCard({title,value,sub,color}:{title:string,value:React.ReactNode,sub:string,color:string}) {
  return (
    <div className="flex flex-col justify-between bg-bg2/40 backdrop-blur-md border border-white/5 p-5 duration-300 rounded-3xl hover:border-vert/30 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -mr-12 -mt-12 group-hover:bg-vert/5 transition-colors"/>
      <p className={`text3 text-[10px] uppercase tracking-[0.2em] mb-2 relative z-10`}>{title}</p>
      <h3 className={`text-3xl font-bold mb-1 relative z-10 ${color}`}>{value}</h3>
      <p className={`text3 text-[11px] italic relative z-10`}>{sub}</p>
    </div>
  );
}

export function TopStatCard({color,item}:{color:string,item:TopStatCardProps|null}) {
  if (!item) return <div className="flex flex-col justify-between bg-bg2/40 backdrop-blur-md border duration-300 border-white/5 p-5 rounded-3xl hover:border-vert/30 transition-all group relative overflow-hidden h-full"/>;
  return (
    <div className="flex flex-col justify-between bg-bg2/40 backdrop-blur-md border duration-300 border-white/5 p-5 rounded-3xl hover:border-vert/30 transition-all group relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -mr-12 -mt-12 group-hover:bg-vert/10 transition-colors pointer-events-none"/>
      <div className="absolute top-4 right-5 z-10">
        <p className={`${color} text-2xl font-black tracking-tighter tabular-nums opacity-80 group-hover:opacity-100 transition-opacity`}>
          {item.rating} <span className="text-xs">/100</span>
        </p>
      </div>

      <div className="relative flex items-end w-full mt-auto">
        <img src={item.img_url} alt={item.name} className="shadow-lg object-cover w-[50%] aspect-square rounded-xl border border-white/10"/>
        
        <div className="flex-1 min-w-0 ml-4 flex flex-col justify-end">
          <h3 className="text-white font-bold truncate leading-tight text-sm">
            {item.name}
          </h3>
          <div className="flex flex-col justify-end">
            {item.isTrack && (
              <>
                <p className="text-gray-400 truncate mt-0.5 text-[11px] leading-none">
                  {item.artist_name}
                </p>
                <p className="text-gray-500 italic font-light text-[10px] truncate mt-1">
                  {item.album_name}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}