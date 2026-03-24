import { ItemBrief } from "../interfaces";
import Widget from "./Widget";

interface TopFiveProps {
  w: number;
  h: number;
  type: 'artists' | 'tracks' | 'albums';
  data: ItemBrief[];
}

export function TopFiveWidget({ w, h, type, data }: TopFiveProps) {
  const items = data?.slice(0, 5) || [];

  const layouts = {
    small:
      <div className="flex flex-col items-center justify-between">
        <p className="truncate max-w-[70px]">{items[0].name}</p>
        <img src={items[0].image} alt={items[0].name}className="w-15 h-15 rounded-full border border-white/20"/>
      </div>,
    horizontal:
      <div className="flex justify-center h-full items-center gap-1">
        <div className="flex flex-col items-center justify-between h-[90%]">
          <p className="truncate max-w-[54px]">{items[0].name}</p>
          <img src={items[0].image} alt={items[0].name}className="w-13 h-13 rounded-full border border-white/20"/>
        </div>
        <div className="flex flex-col border border-white/10 bg-white/5 rounded-xl w-[60%] justify-between h-full p-1">
          {items.slice(1,4).map((item,i) => (
            <div key={item.name} className="flex items-center gap-1">
              <div className="w-3 h-3 text-[5px] rounded-full bg-white/10 flex items-center justify-center text-gray-500 text-xs font-bold">
                {i + 2}
              </div>
              <div className="flex-grow">
                <p className="text-[6px] font-semibold text-white leading-tight truncate max-w-[50px]">{item.name}</p>
              </div>
              {/* Image à l'extrémité droite */}
              <div className="relative flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-5 h-5 rounded-full object-cover border border-white/10 transition-all duration-300"/>
                {/* Petit reflet discret */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"/>
              </div>
            </div>
          ))}
        </div>
      </div>,
    vertical:
      <div className="w-full h-full p-1 flex flex-col px-1">
        {/* Header minimaliste */}
        <div className="mb-0.5 border-b border-white/10 pb-0.5">
          <p className="text-[7px] text-vert uppercase tracking-[0.3em] italic text-center">
            {type}
          </p>
        </div>

        {/* Liste des items */}
        <div className="flex-1 flex flex-col justify-between">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-2 group/line">
              {/* Chiffre stylisé */}
              <span className="text-[12px] font-black italic text-white/20 group-hover/line:text-vert transition-colors leading-none w-3">
                {index + 1}
              </span>
              {/* Image avec bordure adaptée au type */}
              <div className="relative shrink-0 shadow-lg w-[70%]">
                <img src={item.image || "/api/placeholder/40/40"} alt="" 
                  className={`w-7 h-7 object-cover ${type === 'artists' ? 'rounded-full' : 'rounded-md'} border border-white/10`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>,
    large:
      <div className="w-full h-full bg-neutral-950 p-3 rounded-2xl flex flex-col border border-white/10 shadow-2xl relative overflow-hidden group/widget">
      
        {/* EFFET DE FOND : DÉGRADÉ FLOU (Inspiré de Spotify) */}
        <div className="absolute inset-0 opacity-20 group-hover/widget:opacity-30 transition-opacity">
          <img src={items[0].image} className="w-full h-full object-cover scale-150 blur-3xl" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
        </div>

        {/* --- SECTION STAR : LE N°1 --- */}
        <div className="relative flex flex-col items-center justify-center text-center mt-3 mb-6 flex-1 z-10">
          
          {/* Titre du Widget */}
          <p className="text-[10px] font-black text-vert uppercase tracking-[0.4em] italic mb-4">
            N°1 Incontesté {type}
          </p>

          {/* L'Image Géante */}
          <div className="relative mb-4">
            <img 
              src={items[0].image || "/api/placeholder/120/120"} 
              alt={items[0].name} 
              className={`w-32 h-32 object-cover ${type === 'artists' ? 'rounded-full' : 'rounded-2xl'} border-4 border-vert/40 shadow-[0_0_40px_rgba(29,185,84,0.3)] group-hover/widget:scale-105 transition-transform duration-500`}
            />
            <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-vert rounded-full flex items-center justify-center text-black font-black italic text-xl shadow-xl">
              1
            </div>
          </div>

          {/* Le Texte */}
          <div className="space-y-1 w-full px-4 overflow-hidden min-h-12">
            <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none truncate">
              {items[0].name}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-widest leading-none">
              {type === 'tracks' ? items[0].name : `${items[0].streams?.toLocaleString()} streams`}
            </p>
          </div>
        </div>

        {/* --- SECTION RESTE : LE CLASSEMENT EN BAS --- */}
        <div className="relative grid grid-cols-4 gap-2 z-10 border-t border-white/10 pt-4">
          {items.slice(1,5).map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center group/item gap-1">
              
              {/* Index (2, 3, 4, 5) */}
              <span className="text-[10px] font-black italic text-white/30 group-hover/item:text-vert transition-colors leading-none">
                {index + 2}
              </span>

              {/* Image (Petite) */}
              <img 
                src={item.image || "/api/placeholder/40/40"} 
                alt={item.name} 
                className={`w-10 h-10 object-cover ${type === 'artists' ? 'rounded-full' : 'rounded-lg'} border border-white/10 shadow-md group-hover/item:scale-110 transition-transform`}
              />

              {/* Texte (Ultra compact) */}
              <div className="w-full overflow-hidden mt-0.5 px-0.5">
                <p className="text-[8px] font-bold text-white truncate uppercase tracking-tighter leading-none mb-0.5">
                  {item.name}
                </p>
                <p className="text-[7px] text-gray-500 font-medium truncate uppercase tracking-tighter leading-none opacity-80">
                  {item.streams?.toLocaleString()} streams
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
  }

  return (
    <div className="w-full h-full text1">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}