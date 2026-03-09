"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Timer, Music2, Mic2, Calendar, Disc, Play, Clock, Zap, CalendarIcon, Percent, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/app/hooks/useProfile";
import {WeeklyChart, MonthlyChart, ClockChart, CumulativeChart} from "@/app/components/dashboard/Charts";
import { MetricSwitch } from "./MatricSwitch";
import CompactStatCard from "./CompactStatCard";
import AccordionItem from "./AccordionItem";
import IntervalsSelector from "./IntervalSelector";
import TopMediaCard from "./TopMediaCard";
import { DashboardStats, formatToInputDate, getDateRange, getRangeLabel, INITIAL_STATS } from "./utils";

const STYLES = {
  main: "min-h-screen bg-bg1 text-white",
  container: "mx-auto p-8 px-11",
  
  nav: {
    bar: "flex flex-row gap-12 mb-6 justify-between",
    back: "flex gap-2 text-gray-400 hover:text-white transition-colors group",
    title: "text-4xl font-bold mb-2",
    sub: "text-gray-400",
  },
  
  inputs: {
    container: "flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2",
    date: "bg-transparent text-xs text-gray-300 outline-none cursor-pointer [color-scheme:dark]",
  },
  
  grid: {
    container: "flex flex-col lg:flex-row min-h-[200px] w-full items-stretch rounded-[32px] overflow-hidden border border-white/5",
    stats: "grid grid-cols-1 md:grid-cols-3 gap-4",
    habits: (range: string) => {
      const isWide = ["season","3m","half","6m","year","1y","lifetime"].includes(range);
      return `gap-4 grid grid-cols-1 ${isWide ? "md:grid-cols-3" : "md:grid-cols-2"}`;
    },
  }
};

export const FILTER_BAR_STYLES = {
  // Le conteneur principal (Effet de verre + Fond sombre)
  WRAPPER: `flex flex-col px-6 mx-7`,
  // La ligne principale (Switch | Intervals | Dates)
  TOP_ROW: "grid grid-cols-[1fr_auto_1fr] items-center gap-6",
  // Conteneur des inputs de date
  DATE_GROUP: `flex items-center gap-3 px-4 py-2`,
  // Style de l'input date natif
  DATE_INPUT: `bg-transparent text-sm text-white outline-none [color-scheme:dark] appearance-none appearance-none
    [&::-webkit-calendar-picker-indicator]:absolute
    [&::-webkit-calendar-picker-indicator]:inset-0
    [&::-webkit-calendar-picker-indicator]:opacity-0
    [&::-webkit-calendar-picker-indicator]:cursor-pointer
    m-0
    p-0
    w-[90px]`,
  // Barre de navigation du bas (+ / -)
  NAV_CONTROLS: `flex items-center justify-center gap-4 pt-2`,
  // Boutons + et -
  NAV_BTN: `text-xl font-bold text-gray-500 hover:text-vert active:scale-95 cursor-pointer transition-all duration-300 px-4`,
  // Séparateur vertical entre les boutons + et -
  NAV_SEPARATOR: "w-[1px] h-4 bg-white/10"
};

export default function UserStatsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [range, setRange] = useState('year');
  const [offset, setOffset] = useState(0);
  const [extendedStats, setExtendedStats] = useState(INITIAL_STATS as DashboardStats);
  const [activeTab, setActiveTab] = useState<'activite' | 'diversite' | 'habitudes'>("activite");
  const [metric, setMetric] = useState<'streams' | 'minutes'>('minutes');
  const { getDashboard } = useProfile();

  const formatter = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 0});

  const decreaseInterval = () => setOffset(prev => prev - 1);
  const increaseInterval = () => setOffset(prev => prev + 1);
  const onIntervalChange = (interval: string) => {
    setOffset(0);
    setRange(interval);
  };

  useEffect(() => {
    setLoading(true);
    const fetchStats = async () => {
      const { start, end } = getDateRange(range, offset);
      setStartDate(formatToInputDate(start));
      setEndDate(formatToInputDate(end));
      try { setExtendedStats(await getDashboard(`${id}`, start, end)) }
      catch (error) { console.error("Erreur:", error) }
      finally { setTimeout(() => setLoading(false), 150) }
    };

    if (id) fetchStats();
  }, [id, range, offset, getDashboard]);

  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        {/* --- HEADER --- */}
        <div className={STYLES.nav.bar}>
          <div className="flex flex-row gap-12 items-center">
            <button onClick={() => router.back()} className={STYLES.nav.back}>
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
              <span>Retour</span>
            </button>
            <header>
              <h1 className={STYLES.nav.title}>Analyse Détaillée</h1>
              <p className={STYLES.nav.sub}>Plongée profonde dans les habitudes d'écoute.</p>
            </header>
          </div>
        </div>

        {/* --- FILTRES --- */}
        <div className={FILTER_BAR_STYLES.WRAPPER}>
          <div className={FILTER_BAR_STYLES.TOP_ROW}>
            <div/>
            <div className="hidden lg:flex items-center justify-center">
              <IntervalsSelector range={range} onIntervalChange={onIntervalChange}/>
            </div>
            <div className="flex justify-end">
              <MetricSwitch value={metric} onChange={setMetric}/>
            </div>
          </div>

          <div className={FILTER_BAR_STYLES.NAV_CONTROLS}>
            <button className={FILTER_BAR_STYLES.NAV_BTN} onClick={decreaseInterval}>−</button>
            <div className="w-[1px] h-4 bg-white/10" />
            <div className={FILTER_BAR_STYLES.DATE_GROUP}>
              <Calendar size={14} className="text-vert flex-shrink-0" />
              
              {/* On enveloppe les deux états dans un conteneur qui stabilise la hauteur */}
              <div className="flex items-center justify-center h-8 min-w-[210px]"> 
                {getRangeLabel(range, offset) ? (
                  <span className="text-sm font-medium text-white text-center leading-none">
                    {getRangeLabel(range, offset)}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={startDate.split('T')[0]} 
                      className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                      onChange={(e) => { onIntervalChange(e.target.value); setRange("custom"); }} 
                    />
                    <span className="text-gray-600 leading-none">→</span>
                    <input 
                      type="date" 
                      value={endDate.split('T')[0]} 
                      className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                      onChange={(e) => { onIntervalChange(e.target.value); setRange("custom"); }} 
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <button className={FILTER_BAR_STYLES.NAV_BTN} onClick={increaseInterval}>+</button>
          </div>
        </div>

        {/* --- CONTENU --- */}
        <div className={STYLES.grid.container}>
          {/* SECTION 1 : ACTIVITÉ */}
          <AccordionItem id="activite" title="Activité"
            isOpen={activeTab === "activite"} onClick={() => setActiveTab("activite")}
            icon={<Timer className="text-vert" />}
          >
            <div className={STYLES.grid.stats}>
              <CompactStatCard label="Temps d'écoute" icon={<Timer size={32} className="text-vert"/>}
                value={loading ? "..." : `${formatter.format(parseFloat(extendedStats.totalTime.replace(" ","")))} min`} />
              <CompactStatCard label="Streams" icon={<Play size={32} className="text-vert"/>}
                value={loading ? "..." : formatter.format(parseFloat(extendedStats.totalStreams))} />
              <CompactStatCard label="Engagement" icon={<Percent size={32} className="text-vert"/>}
                value={loading ? "..." : extendedStats.ratio} />
            </div>
            <CumulativeChart data={extendedStats.cumulativeData} metric={metric}/>
          </AccordionItem>

          {/* SECTION 2 : BIBLIOTHÈQUE */}
          <AccordionItem id="diversite" title="Bibliothèque"
            isOpen={activeTab === "diversite"} onClick={() => setActiveTab("diversite")}
            icon={<Disc className="text-blue-400" />}
          >
            <div className={STYLES.grid.stats}>
              <CompactStatCard label="Musiques" icon={<Music2 size={32} className="text-blue-400"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueTracks)} />
              <CompactStatCard label="Albums" icon={<Disc size={32} className="text-blue-400"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueAlbums)} />
              <CompactStatCard label="Artistes" icon={<Mic2 size={32} className="text-blue-400"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueArtists)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TopMediaCard type="track" label="Top Titre" item={extendedStats.topTrack} loading={loading} metric={metric}/>
              <TopMediaCard type="album" label="Top Album" item={extendedStats.topAlbum} loading={loading} metric={metric}/>
              <TopMediaCard type="artist" label="Top Artiste" item={extendedStats.topArtist} loading={loading} metric={metric}/>
            </div>
          </AccordionItem>

          {/* SECTION 3 : HABITUDES */}
          <AccordionItem id="habitudes" title="Habitudes"
            isOpen={activeTab === "habitudes"} onClick={() => setActiveTab("habitudes")}
            icon={<Zap className="text-purple-400" />}
          >
            <div className={STYLES.grid.habits(range)}>
              <CompactStatCard label="Heure de pointe" icon={<Clock className="text-purple-400" size={32}/>}
                value={loading ? "..." : extendedStats.peakHour} />
              <CompactStatCard label="Jour favori" icon={<CalendarIcon className="text-purple-400" size={32}/>}
                value={loading ? "..." : extendedStats.peakDay} />
              {["3m", "season", "6m", "half", "1y", "year", "lifetime"].some(r => range.includes(r)) && 
                <CompactStatCard label="Mois musical" icon={<CalendarDays className="text-purple-400" size={32}/>}
                  value={loading ? "..." : extendedStats.peakMonth} />
              }
            </div>
            <div className={STYLES.grid.habits(range)}>
              <ClockChart data={extendedStats.clockData} metric={metric}/>
              <WeeklyChart data={extendedStats.weeklyData} metric={metric}/>
              {["3m", "season", "6m", "half", "1y", "year", "lifetime"].some(r => range.includes(r)) && 
                <MonthlyChart data={extendedStats.monthlyData} metric={metric}/>
              }
            </div>
          </AccordionItem>
        </div>
      </div>
    </main>
  );
}