"use client";

import { useParams } from "next/navigation";
import { Timer, Music2, Mic2, Calendar, Disc, Play, Clock, Zap, CalendarIcon, Percent, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/app/hooks/useProfile";
import {WeeklyChart, MonthlyChart, ClockChart, CumulativeChart, EvolutionChart, AnnualChart, EvolutionStreamsChart} from "@/app/components/dashboard/Charts";
import { MetricSwitch } from "./MetricSwitch";
import CompactStatCard from "./CompactStatCard";
import AccordionItem from "./AccordionItem";
import IntervalsSelector from "./IntervalSelector";
import TopMediaCard from "./TopMediaCard";
import { DashboardStats, formatToInputDate, getDateRange, getRangeLabel, INITIAL_STATS } from "./utils";
import { UserProfile } from "@/app/data/DataInfos";
import { AvatarContainer } from "@/app/components/Atomic/Profile/Profile";
import { SecondaryButton } from "@/app/components/Atomic/Buttons";
import { ErrorState } from "@/app/components/Atomic/Error/Error";
import { ApiError } from "@/app/services/api";

const STYLES = {
  main: "min-h-screen bg-bg1 text-white",
  container: "mx-auto p-8 px-11",
  
  nav: {
    bar: "flex flex-row gap-12 mb-6 justify-between",
    back: "flex gap-2 text-gray-400 hover:text-white transition-colors group",
    title: "text-4xl font-bold mb-2",
    sub: "text-gray-400",
  },
  
  grid: {
    container: "flex flex-col lg:flex-row min-h-[200px] w-full items-stretch rounded-[32px] overflow-hidden border border-white/5",
    stats: "grid grid-cols-1 md:grid-cols-3 gap-4",
    habits: (range: string) => {
      const isWide = ["6m","year","1y","lifetime"].includes(range);
      return `gap-4 grid grid-cols-1 ${isWide ? "md:grid-cols-3" : range === "today" ? "md:grid-cols-1" : "md:grid-cols-2"}`;
    },
  }
};

export const FILTER_BAR_STYLES = {
  // Conteneur des inputs de date
  DATE_GROUP: `flex items-center gap-3`,
  // Style de l'input date natif
  DATE_INPUT: `bg-transparent text-sm text-white outline-none [color-scheme:dark] appearance-none appearance-none
    [&::-webkit-calendar-picker-indicator]:absolute
    [&::-webkit-calendar-picker-indicator]:inset-0
    [&::-webkit-calendar-picker-indicator]:opacity-0
    [&::-webkit-calendar-picker-indicator]:cursor-pointer
    m-0 p-0 w-[90px]`,
};

export default function DashboardPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [range, setRange] = useState('year');
  const [offset, setOffset] = useState(0);
  const [extendedStats, setExtendedStats] = useState(INITIAL_STATS as DashboardStats);
  const [activeTab, setActiveTab] = useState<'activite' | 'diversite' | 'habitudes'>("activite");
  const [metric, setMetric] = useState<'streams' | 'minutes'>('minutes');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const { getDashboard, getProfile } = useProfile();

  const formatter = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 0});

  const decreaseInterval = () => setOffset(prev => prev - 1);
  const increaseInterval = () => setOffset(prev => prev + 1);
  const onIntervalChange = (interval: string) => {
    setOffset(0);
    setRange(interval);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProfile(id+'');
        setProfile(data);
      } catch (err: any) {setError(err)}
      finally {setLoading(false)}
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      const { start, end } = getDateRange(range, offset);
      setStartDate(formatToInputDate(start));
      setEndDate(formatToInputDate(end));

      try {
        const stats = await getDashboard(`${id}`, start, end);
        setExtendedStats(stats);
      } catch (err: any) {
        setError(err);
        setExtendedStats(INITIAL_STATS);
      } finally {setTimeout(() => setLoading(false), 150)}
    };

    fetchStats();
  }, [id, range, offset]);

  if (error && error.status === 404 && !profile) return <ErrorState title="Dashboard introuvable" status={error.status}/>;

  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        {/* --- HEADER --- */}
        <div className={"flex flex-row justify-between items-end mb-3"}>
          <AvatarContainer url={profile?.avatar} username={profile?.display_name} title={
            <header>
              <h1 className={STYLES.nav.title}>Analyse Détaillée</h1>
              <p className={STYLES.nav.sub}>Plongée profonde dans les habitudes d'écoute.</p>
            </header>
          }/>

          <div className="flex items-center justify-center gap-4">
            <SecondaryButton onClick={decreaseInterval} disabled={range === "lifetime"}
              additional={`${range !== "lifetime" && 'hover:text-vert'} text-xl px-2.5 pb-1`}>
              −
            </SecondaryButton>
            <div className="w-[1px] h-4 bg-white/10"/>
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
            <div className="w-[1px] h-4 bg-white/10"/>
            <SecondaryButton onClick={increaseInterval} disabled={offset === 0}
              additional={`${offset !== 0 && 'hover:text-vert'} text-xl px-2.5 pb-1`}>
              +
            </SecondaryButton>
          </div>

          <div className="hidden lg:flex flex-col items-end min-w-[305px]">
            <IntervalsSelector range={range} onIntervalChange={onIntervalChange}/>
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
                value={loading ? "..." : `${formatter.format(extendedStats.totalTime)} min`} />
              <CompactStatCard label="Streams" icon={<Play size={32} className="text-vert"/>}
                value={loading ? "..." : formatter.format(extendedStats.totalStreams)} />
              <CompactStatCard label="Engagement" icon={<Percent size={32} className="text-vert"/>}
                value={loading ? "..." : extendedStats.ratio} />
            </div>
            {range !== "today" && (
              <>
                <CumulativeChart data={extendedStats.cumulativeData}/>
                <EvolutionStreamsChart data={extendedStats.streamsEvolution}/>
              </>
            )}
          </AccordionItem>

          {/* SECTION 2 : BIBLIOTHÈQUE */}
          <AccordionItem id="diversite" title="Bibliothèque"
            isOpen={activeTab === "diversite"} onClick={() => setActiveTab("diversite")}
            icon={<Disc className="text-blue-400" />} switchOption={
              <div className="flex w-full justify-end mb-1">
                <MetricSwitch value={metric} onChange={setMetric}/>
              </div>
            }
          >
            
            <div className={STYLES.grid.stats}>
              <CompactStatCard label="Musiques" icon={<Music2 size={32} className="text-blue-400"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueTracks)} />
              <CompactStatCard label="Albums" icon={<Disc size={32} className="text-blue-400"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueAlbums)} />
              <CompactStatCard label="Artistes" icon={<Mic2 size={32} className="text-blue-400"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueArtists)} />
            </div>

            <div className={STYLES.grid.stats}>
              <TopMediaCard type="track" label="Top Titre" item={extendedStats.topTrack} loading={loading} metric={metric}/>
              <TopMediaCard type="album" label="Top Album" item={extendedStats.topAlbum} loading={loading} metric={metric}/>
              <TopMediaCard type="artist" label="Top Artiste" item={extendedStats.topArtist} loading={loading} metric={metric}/>
            </div>

            {range !== "today" && <EvolutionChart data={extendedStats.entityEvolution} loading={false}/>}
          </AccordionItem>

          {/* SECTION 3 : HABITUDES */}
          <AccordionItem id="habitudes" title="Habitudes"
            isOpen={activeTab === "habitudes"} onClick={() => setActiveTab("habitudes")}
            icon={<Zap className="text-purple-400" />} switchOption={
              <div className="flex w-full justify-end mb-1">
                <MetricSwitch value={metric} onChange={setMetric}/>
              </div>
            }
          >
            <div className={STYLES.grid.habits(range)}>
              <CompactStatCard label="Heure de pointe" icon={<Clock className="text-purple-400" size={32}/>}
                value={loading ? "..." : metric === "minutes" ? extendedStats.peakHour[0] : extendedStats.peakHour[1]} />
              {range !== "today" && <CompactStatCard label="Jour favori" icon={<CalendarIcon className="text-purple-400" size={32}/>}
                value={loading ? "..." : metric === "minutes" ? extendedStats.peakDay[0] : extendedStats.peakDay[1]} />}
              {["6m", "half", "1y", "year", "lifetime"].some(r => range.includes(r)) && 
                <CompactStatCard label="Mois musical" icon={<CalendarDays className="text-purple-400" size={32}/>}
                  value={loading ? "..." : metric === "minutes" ? extendedStats.peakMonth[0] : extendedStats.peakMonth[1]} />
              }
            </div>
            <div className={STYLES.grid.habits(range)}>
              <ClockChart data={extendedStats.clockData} metric={metric}/>
              {range !== "today" && <WeeklyChart data={extendedStats.weeklyData} metric={metric}/>}
              {["6m", "1y", "year", "lifetime"].some(r => range.includes(r)) && 
                <MonthlyChart data={extendedStats.monthlyData} metric={metric}/>
              }
            </div>
            {["lifetime"].some(r => range.includes(r)) &&
              <AnnualChart data={extendedStats.annualData} metric={metric}/>
            }
          </AccordionItem>
        </div>
      </div>
    </main>
  );
}