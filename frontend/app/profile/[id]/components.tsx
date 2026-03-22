import { useLanguage } from "@/app/context/languageContext";
import { TopStatCardProps } from "@/app/data/DataInfos";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export function HorizontalTopSection({ title, items }: { title: string, items: any[] }) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const { t } = useLanguage();
  const dict = t.common;
  const RATING = (rating: number) => {
    const color = rating >= 1.35 ? `text2` : rating >= 0.8 ? 'text-jaune' : 'text-rouge';
    return `text-3xl font-mono font-bold text-center ${color}`;
  }
  return (
    <section className="flex flex-col gap-4 my-12">
      {/* Header de la section */}
      <div className="flex justify-between items-end px-2">
        <h2 className="text1 text-xl font-bold tracking-tight">{title}</h2>
      </div>

      {/* Conteneur de scroll horizontal */}
      <>
        <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar">
          {items.map((item, index) => (
            <div key={index} className="flex-shrink-0 w-[100px] md:w-[120px] snap-start group cursor-pointer" onClick={() => setSelectedItem(item)}>
              {/* Image avec Overlay de Rank */}
              <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-lg border border-white/5">
                <img src={item.image_url} alt={item.name}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110`}
                />
                {/* Badge de classement */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                  <span className="text-[10px] font-mono font-bold text-white">#{index + 1}</span>
                </div>
              </div>

              {/* Légendes */}
              <p className="text1 font-bold truncate group-hover:text-vert transition-colors text-sm">{item.name}</p>
              <p className="text3 text-xs truncate opacity-60 font-medium">{item.rating}★</p>
            </div>
          ))}
        </div>
        {/* --- POPUP (MODALE) --- */}
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Overlay sombre */}
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedItem(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              
              {/* Contenu de la Popup */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-bg1 border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
              >
                {/* Image de fond floutée pour le style */}
                <div className="absolute top-0 inset-x-0 h-32 opacity-20 blur-2xl" 
                  style={{ backgroundImage: `url(${selectedItem.image_url})`, backgroundSize: 'cover' }}
                />

                <div className="relative p-8 flex flex-col items-center">
                  <img src={selectedItem.image_url} className="w-32 h-32 rounded-2xl shadow-2xl mb-6 border border-white/10" />
                  
                  <h3 className="text-2xl font-black text-white text-center mb-1">{selectedItem.name}</h3>
                  <p className="text-vert font-bold mb-8 uppercase tracking-widest text-xs w-full text-center">
                    {selectedItem.album_name ? `${selectedItem.album_name} ● ${selectedItem.artist_name}` : selectedItem.artist_name}
                  </p>

                  {/* Grille de stats locales */}
                  <div className="grid grid-cols-3 gap-4 w-full">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">{dict.streams}</p>
                      <p className="text-xl font-mono font-bold text-white">
                        {selectedItem.count?.toLocaleString(t.common.locale) || '—'}
                      </p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">{dict.minutes}</p>
                      <p className="text-xl font-mono font-bold text-white">
                        {(selectedItem.minutes || 0).toLocaleString(t.common.locale)}
                      </p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">{dict.engagement}</p>
                      <p className="text-xl font-mono font-bold text-white">
                        {(selectedItem.engagement || 0).toLocaleString(t.common.locale)}%
                      </p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 col-span-3">
                      <p className={RATING(selectedItem.rating || 0)}>
                        {(selectedItem.rating || 0).toLocaleString(t.common.locale)}★
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="mt-8 text-xs uppercase tracking-widest font-bold text-gray-500 hover:text-white transition-colors"
                  >{t.ranking.closeBtn}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    </section>
  );
}

export function StatCard({title,value,sub,color}:{title:string,value:React.ReactNode,sub:string,color:string}) {
  return (
    <div className="flex flex-col justify-between bg-bg2/40 backdrop-blur-md border border-white/5 p-5 duration-300 rounded-3xl hover:border-vert/30 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -mr-12 -mt-12 group-hover:bg-vert/5 transition-colors"/>
      <p className={`text3 text-[10px] uppercase tracking-[0.2em] mb-2 relative z-10`}>{title}</p>
      <h3 className={`text-2xl font-bold mb-1 relative z-10 ${color}`}>{value}</h3>
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