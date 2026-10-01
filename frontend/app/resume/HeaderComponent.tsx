import { ListFilter, Minus, Plus } from "lucide-react";
import { DataFormat, RangeOption, SortOption } from "./interfaces";
import { useLanguage } from "../context/languageContext";

interface HeaderComponentProps {
  range: RangeOption;
  setRange: React.Dispatch<React.SetStateAction<RangeOption>>;
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  displayLabel: string | number;
}

export function HeaderComponent({range, setRange, offset, setOffset, displayLabel}:HeaderComponentProps) {
  const { t } = useLanguage();
  const periodLabels: Record<RangeOption, string> = {
    day: t.resume.periodDay, month: t.resume.periodMonth, season: t.resume.periodSeason,
    year: t.resume.periodYear, lifetime: t.resume.periodLifetime,
  };
  // Reset de l'offset quand on change de type de range
  const handleRangeChange = (newRange: RangeOption) => {
    setRange(newRange);
    setOffset(0);
  };

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1">
      {/* Sélecteur de Tri */}
      {/* <div className="flex items-center gap-3 pr-2 bg-black/40 rounded-xl p-0.5 border border-white/5">
        <div className="px-2 text-gray-500"><ListFilter size={16}/></div>
        {[
          { id: 'streams', label: 'Streams' },
          { id: 'minutes', label: 'Temps' },
          { id: 'rating', label: 'Rating' }
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSortBy(opt.id as SortOption)}
            className={`px-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all  ${
              sortBy === opt.id ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
            }`}
          >{opt.label}</button>
        ))}
      </div> */}

      {/* <div className="hidden md:block w-px h-6 bg-white/10" /> */}

      <div className='flex gap-2'>
        {/* Sélecteur de Type (Range) */}
        <div className="flex items-center gap-3 px-2 bg-black/40 rounded-xl p-0.5 border border-white/5">
          {(['day', 'month', 'season', 'year', 'lifetime'] as RangeOption[]).map((opt) => (
            <button key={opt} type="button" aria-pressed={range === opt} onClick={() => handleRangeChange(opt)}
              className={`px-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                range === opt ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
              }`}
            >{periodLabels[opt]}</button>
          ))}
        </div>

        {/* Contrôleur de Navigation Temporelle */}
        <div className="justify-between flex items-center gap-1 bg-black/40 rounded-xl border border-white/5">
          <button type="button" aria-label={t.resume.previousPeriod} onClick={() => setOffset(prev => prev + 1)} disabled={range === 'lifetime'}
            className="px-2 py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
          ><Minus size={16} strokeWidth={3}/></button>

          <p role="status" aria-live="polite" className="text-sm font-black uppercase italic tracking-tighter leading-none w-[150px] text-center">
            {displayLabel}
          </p>

          <button type="button" aria-label={t.resume.nextPeriod} onClick={() => setOffset(prev => Math.max(0, prev - 1))} disabled={range === 'lifetime' || offset === 0}
            className="px-2 py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-vert disabled:opacity-20 transition-all active:scale-90"
          ><Plus size={16} strokeWidth={3} /></button>
        </div>
      </div>
    </div>
  );
}