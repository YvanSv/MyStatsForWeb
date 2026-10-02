"use client";

import { useParams } from "next/navigation";
import { Timer, Music2, Mic2, Calendar, Disc, Play, Clock, Zap, CalendarIcon, Percent, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import {WeeklyChart, MonthlyChart, ClockChart, CumulativeChart, EvolutionChart, AnnualChart, EvolutionStreamsChart} from "@/app/components/dashboard/Charts";
import { MetricSwitch } from "./MetricSwitch";
import CompactStatCard from "./CompactStatCard";
import AccordionItem from "./AccordionItem";
import IntervalsSelector from "./IntervalSelector";
import TopMediaCard from "./TopMediaCard";
import { getRangeLabel, smoothHourlyData } from "./utils";
import { useDashboardData } from "./useDashboardData";
import AvatarContainer from "./AvatarContainer";
import { SecondaryButton } from "@/app/components/Atomic/Buttons";
import { ErrorState } from "@/app/components/Atomic/Error/Error";
import { useLanguage } from "@/app/context/languageContext";
import { eachDayOfInterval, format, isAfter, min, parseISO } from 'date-fns';

// Périodes assez longues pour afficher le mois musical et le graphique mensuel
const WIDE_RANGES = ["6m", "year", "lifetime"];

const STYLES = {
  main: "min-h-screen text-white",
  container: "mx-auto p-2 py-6 sm:p-5 lg:p-8",
  
  nav: {
    bar: "flex flex-row gap-12 mb-6 justify-between",
    back: "flex gap-2 text-gray-400 hover:text-white transition-colors group",
    title: "text-xl lg:text-4xl font-bold",
    sub: "text-xs lg:text-md text-gray-400",
  },
  
  grid: {
    container: "flex flex-col lg:flex-row w-full items-stretch rounded-[32px] overflow-hidden border border-white/5 h-[800px]",
    stats: "grid grid-cols-3 gap-1 lg:gap-4",
    top_items: "flex flex-col md:grid md:grid-cols-3 gap-2 lg:gap-4",
    habits_stats: (range: string) => {
      const isWide = WIDE_RANGES.includes(range);
      return `gap-3 lg:gap-4 grid ${isWide ? "grid-cols-3" : range === "today" ? "grid-cols-1" : "grid-cols-2"}`;
    },
    habits: (range: string) => {
      const isWide = WIDE_RANGES.includes(range);
      return `gap-3 lg:gap-4 grid ${isWide ? "grid-cols-2 lg:grid-cols-3" : range === "today" ? "grid-cols-1" : "grid-cols-2"}`;
    },
  }
};

export const FILTER_BAR_STYLES = {
  // Conteneur des inputs de date
  DATE_GROUP: `flex items-center gap-1 lg:gap-3`,
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
  const { t } = useLanguage();
  const dict = t.dashboard;
  // Bornes saisies à la main (période personnalisée), au format AAAA-MM-JJ
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [range, setRange] = useState('lifetime');
  const [offset, setOffset] = useState(0);
  const { profile, profileError, statsError, extendedStats, startDate, endDate, loading, retry } = useDashboardData({
    id: id ? `${id}` : undefined, range, offset, customStart, customEnd,
  });
  const [activeTab, setActiveTab] = useState<'activite' | 'diversite' | 'habitudes'>("activite");
  const [metric, setMetric] = useState<'streams' | 'minutes'>('minutes');

  const formatter = new Intl.NumberFormat(t.common.locale, { maximumFractionDigits: 0 });

  const decreaseInterval = () => setOffset(prev => prev - 1);
  const increaseInterval = () => setOffset(prev => prev + 1);
  const onIntervalChange = (interval: string) => {
    setOffset(0);
    // La période personnalisée part de la période affichée, pour pouvoir l'ajuster
    if (interval === 'custom' && range !== 'custom') {
      setCustomStart(startDate);
      setCustomEnd(endDate);
    }
    setRange(interval);
  };
  // Saisie d'une date : la période affichée devient la période personnalisée.
  // Le début ne peut pas dépasser la fin : la borne qui n'a pas été saisie suit alors la valeur saisie.
  const onCustomDateChange = (which: 'start' | 'end', value: string) => {
    if (!value) return;
    let from = customStart || startDate;
    let to = customEnd || endDate;
    if (which === 'start') {
      from = value;
      if (to && from > to) to = from;
    } else {
      to = value;
      if (from && from > to) from = to;
    }
    setCustomStart(from);
    setCustomEnd(to);
    setOffset(0);
    setRange('custom');
  };
  const label = getRangeLabel(range, offset, t);
  const isCustom = range === 'custom';

  const filledEvolutionData = useMemo(() => {
    const rawData = extendedStats.streamsEvolution;
    if (!rawData || rawData.length === 0) return [];

    try {
      const start = startDate 
          ? parseISO(startDate) 
          : parseISO(rawData[0].date);
      const endRequested = endDate ? parseISO(endDate) : new Date();
      const actualEnd = min([endRequested, new Date()]);

      if (isNaN(start.getTime()) || isNaN(actualEnd.getTime())) return [];
      if (isAfter(start, actualEnd)) return [];

      const allDays = eachDayOfInterval({ start, end: actualEnd });
      const dataMap = new Map(rawData.map(item => [item.date, item]));

      return allDays.map((day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const existing = dataMap.get(dateStr);

        return {
          date: dateStr,
          streams: existing ? Number(existing.streams) : 0,
          minutes: existing ? Number(existing.minutes) : 0,
        };
      });
    } catch (e) {
      console.error("Erreur Evolution Chart:", e);
      return [];
    }
  }, [extendedStats.streamsEvolution, startDate, endDate]);

  const filledCumlativeData = useMemo(() => {
    const rawData = extendedStats.cumulativeData;
    if (!rawData || rawData.length === 0) return [];

    try {
        const start = startDate 
            ? parseISO(startDate) 
            : parseISO(rawData[0].date);
        const endRequested = endDate ? parseISO(endDate) : new Date();
        const actualEnd = min([endRequested, new Date()]);

        if (isNaN(start.getTime()) || isNaN(actualEnd.getTime())) return [];
        if (isAfter(start, actualEnd)) return [];

        const allDays = eachDayOfInterval({ start, end: actualEnd });
        const dataMap = new Map(rawData.map(item => [item.date, item]));
        
        let lastValidStreams = 0;
        let lastValidMinutes = 0;

        const result = allDays.map((day: Date) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const existing = dataMap.get(dateStr);

            if (existing) {
                lastValidStreams = Number(existing.streams);
                lastValidMinutes = Number(existing.minutes);
            }

            return {
                date: dateStr,
                streams: lastValidStreams,
                minutes: lastValidMinutes,
            };
        });
        return result;
    } catch (e) {
        console.error("Erreur format dates Cumulative:", e);
        return [];
    }
  }, [extendedStats.cumulativeData, startDate, endDate]);

  const processedData = useMemo(() => {
    if (range === "today") return smoothHourlyData(extendedStats.clockData);
    return extendedStats.clockData;
  }, [extendedStats.clockData, range]);

  // Après tous les hooks (règle des hooks) : une page introuvable n'affiche que l'erreur
  if (profileError && profileError.status === 404 && !profile) return <ErrorState title={dict.notFound} status={profileError.status}/>;
  const loadError = profileError || statsError;

  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-4 mb-4 px-4 py-3 rounded-2xl border border-rouge/30 bg-rouge/10 text-sm">
            <span>{dict.loadError}</span>
            <SecondaryButton onClick={retry} additional="px-3 py-1">{dict.retry}</SecondaryButton>
          </div>
        )}
        {/* --- HEADER --- */}
        <div className={"flex flex-row justify-between items-end lg:mb-3"}>
          <AvatarContainer url={profile?.avatar} username={profile?.display_name} special={!!profile?.is_special} title={
            <header className="flex flex-col h-full justify-between">
              <div>
                <h1 className={STYLES.nav.title}>{dict.title}</h1>
                <p className={`${STYLES.nav.sub} truncate`}>{dict.subtitle}</p>
              </div>
              <div className="lg:hidden flex items-center justify-center gap-1">
                <SecondaryButton onClick={decreaseInterval} disabled={range === "lifetime" || isCustom}
                  additional={`${range !== "lifetime" && !isCustom ? 'hover:text-vert' : ''} text-lg px-1 pb-1`}>
                  −
                </SecondaryButton>
                <div className="w-[1px] h-4 bg-white/10"/>
                <div className={FILTER_BAR_STYLES.DATE_GROUP}>
                  <Calendar size={14} className="text-vert flex-shrink-0" />
                  
                  <div className="flex items-center justify-center h-6 min-w-[150px]"> 
                    {label ? (
                      <span className="text-sm font-medium text-white text-center leading-none">
                        {label}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" aria-label={dict.dateStart}
                          value={startDate} max={endDate || undefined} 
                          className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                          onChange={(e) => onCustomDateChange('start', e.target.value)} 
                        />
                        <span className="text-gray-600 leading-none">→</span>
                        <input 
                          type="date" aria-label={dict.dateEnd}
                          value={endDate} min={startDate || undefined} 
                          className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                          onChange={(e) => onCustomDateChange('end', e.target.value)} 
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-[1px] h-4 bg-white/10"/>
                <SecondaryButton onClick={increaseInterval} disabled={offset === 0 || isCustom}
                  additional={`${offset !== 0 && !isCustom ? 'hover:text-vert' : ''} text-lg px-1 pb-1`}>
                  +
                </SecondaryButton>
              </div>
            </header>
          }/>

          <div className="hidden lg:flex items-center justify-center gap-4">
            <SecondaryButton onClick={decreaseInterval} disabled={range === "lifetime" || isCustom}
              additional={`${range !== "lifetime" && !isCustom ? 'hover:text-vert' : ''} text-xl px-2.5 pb-1`}>
              −
            </SecondaryButton>
            <div className="w-[1px] h-4 bg-white/10"/>
            <div className={FILTER_BAR_STYLES.DATE_GROUP}>
              <Calendar size={14} className="text-vert flex-shrink-0" />
              
              <div className="flex items-center justify-center h-8 min-w-[210px]"> 
                {label ? (
                  <span className="text-sm font-medium text-white text-center leading-none">
                    {label}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" aria-label={dict.dateStart}
                      value={startDate} max={endDate || undefined} 
                      className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                      onChange={(e) => onCustomDateChange('start', e.target.value)} 
                    />
                    <span className="text-gray-600 leading-none">→</span>
                    <input 
                      type="date" aria-label={dict.dateEnd}
                      value={endDate} min={startDate || undefined} 
                      className={`${FILTER_BAR_STYLES.DATE_INPUT} leading-none py-0 h-6`}
                      onChange={(e) => onCustomDateChange('end', e.target.value)} 
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="w-[1px] h-4 bg-white/10"/>
            <SecondaryButton onClick={increaseInterval} disabled={offset === 0 || isCustom}
              additional={`${offset !== 0 && !isCustom ? 'hover:text-vert' : ''} text-xl px-2.5 pb-1`}>
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
          <AccordionItem id="activite" title={dict.tabActivity}
            isOpen={activeTab === "activite"} onClick={() => setActiveTab("activite")}
            icon={<Timer className="text-vert" />}
          >
            <div className={STYLES.grid.stats}>
              <CompactStatCard label={dict.statTime} icon={<Timer className="text2 w-4 h-4 lg:w-6 lg:h-6"/>}
                value={loading ? "..." : `${formatter.format(extendedStats.totalTime)} ${dict.unitMin}`} />
              <CompactStatCard label={dict.statStreams} icon={<Play className="text2 w-4 h-4 lg:w-6 lg:h-6"/>}
                value={loading ? "..." : formatter.format(extendedStats.totalStreams)} />
              <CompactStatCard label={dict.statEngagement} icon={<Percent className="text2 w-4 h-4 lg:w-6 lg:h-6"/>}
                value={loading ? "..." : extendedStats.ratio} />
            </div>
            {range !== "today" && (
              <>
                <CumulativeChart data={filledCumlativeData}/>
                <EvolutionStreamsChart data={filledEvolutionData}/>
              </>
            )}
          </AccordionItem>

          {/* SECTION 2 : BIBLIOTHÈQUE */}
          <AccordionItem id="diversite" title={dict.tabLibrary}
            isOpen={activeTab === "diversite"} onClick={() => setActiveTab("diversite")}
            icon={<Disc className="text-blue-400" />} switchOption={
              <div className="flex w-full justify-end mb-1">
                <MetricSwitch value={metric} onChange={setMetric}/>
              </div>
            }
          >
            <div className={STYLES.grid.stats}>
              <CompactStatCard label={dict.statTracks} icon={<Music2 className="text-blue-400 w-6 h-6"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueTracks)} />
              <CompactStatCard label={dict.statAlbums} icon={<Disc className="text-blue-400 w-6 h-6"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueAlbums)} />
              <CompactStatCard label={dict.statArtists} icon={<Mic2 className="text-blue-400 w-6 h-6"/>}
                value={loading ? "..." : formatter.format(extendedStats.uniqueArtists)} />
            </div>

            <div className={STYLES.grid.top_items}>
              <TopMediaCard type="track" label={dict.topTrack} item={extendedStats.topTrack} loading={loading} metric={metric}/>
              <TopMediaCard type="album" label={dict.topAlbum} item={extendedStats.topAlbum} loading={loading} metric={metric}/>
              <TopMediaCard type="artist" label={dict.topArtist} item={extendedStats.topArtist} loading={loading} metric={metric}/>
            </div>

            {range !== "today" && <EvolutionChart data={extendedStats.entityEvolution}/>}
          </AccordionItem>

          {/* SECTION 3 : HABITUDES */}
          <AccordionItem id="habitudes" title={dict.tabHabits}
            isOpen={activeTab === "habitudes"} onClick={() => setActiveTab("habitudes")}
            icon={<Zap className="text-purple-400" />} switchOption={
              <div className="flex w-full justify-end mb-1">
                <MetricSwitch value={metric} onChange={setMetric}/>
              </div>
            }
          >
            <div className={STYLES.grid.habits_stats(range)}>
              <CompactStatCard label={dict.statPeakHour} icon={<Clock className="text-purple-400 w-4 h-4"/>}
                value={loading ? "..." : metric === "minutes" ? extendedStats.peakHour[0] : extendedStats.peakHour[1]} />
              {range !== "today" && <CompactStatCard label={dict.statPeakDay} icon={<CalendarIcon className="text-purple-400 w-4 h-4"/>}
                value={loading ? "..." : metric === "minutes" ? extendedStats.peakDay[0] : extendedStats.peakDay[1]} />}
              {WIDE_RANGES.includes(range) && 
                <CompactStatCard label={dict.statPeakMonth} icon={<CalendarDays className="text-purple-400 w-4 h-4"/>}
                  value={loading ? "..." : metric === "minutes" ? extendedStats.peakMonth[0] : extendedStats.peakMonth[1]} />
              }
            </div>

            <div className={STYLES.grid.habits(range)}>
              <ClockChart data={processedData} metric={metric} daysCount={range==="today" ? 1 : 0}/>
              {range !== "today" && <WeeklyChart data={extendedStats.weeklyData} metric={metric}/>}
              {WIDE_RANGES.includes(range) && 
                <div className={`${range === "lifetime" ? "col-span-1" : "col-span-2 lg:col-span-1"}`}><MonthlyChart data={extendedStats.monthlyData} metric={metric}/></div>
              }
              {range === "lifetime" &&
                <div className="col-span-1 lg:col-span-3"><AnnualChart data={extendedStats.annualData} metric={metric}/></div>
              }
            </div>
          </AccordionItem>
        </div>
      </div>
    </main>
  );
}