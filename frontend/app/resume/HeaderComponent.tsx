import { ListFilter, Minus, Plus } from "lucide-react";
import { DataFormat, RangeOption, SortOption } from "./interfaces";
import { useLanguage } from "../context/languageContext";

interface HeaderComponentProps {
  range: RangeOption;
  setRange: React.Dispatch<React.SetStateAction<RangeOption>>;
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  sortBy: SortOption;
  setSortBy: React.Dispatch<React.SetStateAction<SortOption>>;
  displayLabel: string | number;
}

export function HeaderComponent({range, setRange, offset, setOffset, sortBy, setSortBy, displayLabel}:HeaderComponentProps) {
  const { t } = useLanguage();
  
  // Reset de l'offset quand on change de type de range
  const handleRangeChange = (newRange: RangeOption) => {
    setRange(newRange);
    setOffset(0);
  };

  return (
    <div className="mx-auto flex justify-between mb-4 px-4 md:px-12">
      <div className="flex flex-col items-start">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">{t.resume.title || "Your Universe"}</h1>
        <p className="text-gray-500 font-medium ml-3">Partagez un résumé</p>
      </div>

      {/* BARRE DE FILTRES */}
      <div className="flex flex-wrap justify-between items-center gap-4 p-2 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
        
        {/* Sélecteur de Tri */}
        <div className="flex items-center gap-2 bg-black/20 rounded-xl p-1 border border-white/5">
          <div className="p-2 text-gray-500"><ListFilter size={16} /></div>
          {[
            { id: 'streams', label: 'Streams' },
            { id: 'minutes', label: 'Temps' },
            { id: 'rating', label: 'Rating' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id as SortOption)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === opt.id 
                ? "bg-white/10 text-white shadow-lg" 
                : "text-gray-500 hover:text-gray-300"
              }`}
            >{opt.label}</button>
          ))}
        </div>

        <div className="hidden md:block w-px h-6 bg-white/10" />

        {/* Sélecteur de Type (Range) */}
        <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
          {(['day', 'month', 'season', 'year', 'lifetime'] as RangeOption[]).map((opt) => (
            <button key={opt} onClick={() => handleRangeChange(opt)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                range === opt ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
              }`}
            >{opt}</button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Contrôleur de Navigation Temporelle */}
        <div className="flex items-center w-xs justify-between gap-4 bg-black/40 rounded-xl p-1 border border-white/5">
          {/* Groupe Boutons +/- */}
          <div className="flex items-center gap-1">
            <button onClick={() => setOffset(prev => prev + 1)} disabled={range === 'lifetime'}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
            ><Minus size={16} strokeWidth={3}/></button>
          </div>

          {/* Affichage du Label */}
          <div className="flex flex-col w-2xs text-center bg-white/10 text-white rounded-2xl p-1.5 pr-4 shadow-inner">
            <span className="text-md font-black text-white uppercase italic tracking-tighter leading-none min-w-[120px]">
              {displayLabel}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setOffset(prev => Math.max(0, prev - 1))} disabled={range === 'lifetime' || offset === 0}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
            ><Plus size={16} strokeWidth={3} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}