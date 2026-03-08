"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Timer, Music2, Mic2, Calendar, Disc, Play, Clock, Zap, CalendarIcon, Percent, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import DashboardSkeleton from "./Skeleton";
import { useProfile } from "@/app/hooks/useProfile";
import {WeeklyChart, MonthlyChart, ClockChart, CumulativeChart} from "@/app/components/dashboard/Charts";
import { MetricSwitch } from "./MatricSwitch";

const formatToInputDate = (dateISO: string | null) => {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  
  // On récupère l'année, le mois et le jour localement
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const getDateRange = (range: string, offset:number = 0) => {
  const start = new Date();
  const end = new Date();
  
  switch (range) {
    case 'today':
      start.setDate(start.getDate() + offset);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + offset);
      end.setHours(23, 59, 59, 999);
      break;

    case '24h':
      start.setHours(start.getHours() + (offset * 24) - 24);
      end.setHours(end.getHours() + (offset * 24));
      break;

    case 'week':
      const currentDay = start.getDay();
      start.setDate(start.getDate() - currentDay + (offset * 7));
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case '7d':
      start.setDate(start.getDate() + (offset * 7) - 7);
      end.setDate(end.getDate() + (offset * 7));
      break;

    case 'month':
      // Décale de X mois calendaires
      start.setMonth(start.getMonth() + offset, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case '1m':
      start.setDate(start.getDate() + (offset * 30) - 30);
      end.setDate(end.getDate() + (offset * 30));
      break;

    case 'season': {
      // 1. Déterminer le début de la saison actuelle (Mars, Juin, Sept, Déc)
      const currentMonth = start.getMonth();
      let startMonth = 11; // Décembre (Hiver)
      if (currentMonth >= 2 && currentMonth <= 4) startMonth = 2;      // Mars (Printemps)
      else if (currentMonth >= 5 && currentMonth <= 7) startMonth = 5; // Juin (Été)
      else if (currentMonth >= 8 && currentMonth <= 10) startMonth = 8;// Sept (Automne)
      
      // 2. Appliquer l'offset (1 unité = 3 mois)
      start.setMonth(startMonth + (offset * 3), 1);
      start.setHours(0, 0, 0, 0);
      
      // La fin de la saison est 3 mois après le début, moins 1 jour
      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 3, 0); 
      end.setHours(23, 59, 59, 999);
      break;
    }

    case '3m':
      start.setDate(start.getDate() + (offset * 90) - 90);
      end.setDate(end.getDate() + (offset * 90));
      break;

    case 'half': {
      // 1. Déterminer le début du semestre (Janvier ou Juillet)
      const isFirstHalf = start.getMonth() < 6;
      const startMonth = isFirstHalf ? 0 : 6;
      
      // 2. Appliquer l'offset (1 unité = 6 mois)
      start.setMonth(startMonth + (offset * 6), 1);
      start.setHours(0, 0, 0, 0);
      
      // La fin du semestre est 6 mois après le début, moins 1 jour
      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 6, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case '6m':
      start.setDate(start.getDate() + (offset * 180) - 180);
      end.setDate(end.getDate() + (offset * 180));
      break;

    case 'year':
      start.setFullYear(start.getFullYear() + offset, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(start.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;

    case '1y':
      start.setFullYear(start.getFullYear() + offset - 1);
      end.setFullYear(end.getFullYear() + offset);
      break;

    case 'lifetime':
      return { start: null, end: null };

    default:
      start.setHours(0, 0, 0, 0);
  }

  return { 
    start: start.toISOString(), 
    end: end.toISOString() 
  };
};

const INITIAL_STATS = {
  totalTime: "-- min",
  avgTimePerDay: "-- min",
  totalStreams: "0",
  avgStreamsPerDay: 0,
  uniqueTracks: 0,
  uniqueAlbums: 0,
  uniqueArtists: 0,
  peakHour: "--:--",
  peakDay: "--",
  peakMonth: "--",
  ratio: "0%",
  clockData: [],
  weeklyData: [],
  monthlyData: [],
  cumulativeData: []
};

const BASE_UI = {
  glass: "bg-white/[0.02] border border-white/5",
  glassHover: "hover:bg-white/[0.05] hover:border-white/10 transition-all",
  flexCenter: "flex items-center justify-center",
  textTitle: "uppercase font-bold tracking-[0.2em]",
  transition: "transition-all duration-300 ease-in-out",
};

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
    container: "flex flex-col lg:flex-row min-h-[400px] w-full items-stretch rounded-[32px] overflow-hidden",
    stats: "grid grid-cols-1 md:grid-cols-3 gap-4",
    habits: (range: string) => {
      const isWide = ["season","3m","half","6m","year","1y","lifetime"].includes(range);
      return `gap-4 grid grid-cols-1 ${isWide ? "md:grid-cols-3" : "md:grid-cols-2"}`;
    },
  }
};

const COMPONENT_STYLES = {
  accordion: {
    item: (isOpen: boolean) => `
      relative overflow-hidden ${BASE_UI.transition} ${BASE_UI.glass} [&:not(:first-child)]:border-l
      ${isOpen ? "flex-[20] bg-white/[0.04] shadow-2xl" : `flex-[1] ${BASE_UI.glassHover} cursor-pointer`}
    `,
    titleVertical: (isOpen: boolean) => `
      absolute inset-0 ${BASE_UI.flexCenter} transition-all duration-500
      ${isOpen ? "opacity-0 invisible" : "opacity-100 visible"}
    `,
    content: (isOpen: boolean) => `
      p-8 h-full transition-opacity duration-500 delay-200
      ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}
    `,
  },

  statCard: {
    base: `px-5 py-3 rounded-2xl ${BASE_UI.glass} ${BASE_UI.glassHover} group`,
    label: "text-xs text-gray-500 uppercase font-bold",
    value: "text-xl font-bold",
  },

  selector: {
    container: "flex bg-white/[0.03] border border-white/10 rounded-xl shadow-inner overflow-hidden w-fit",
    btn: (isActive: boolean, isLifetime = false) => `
      px-3 py-2 text-xs font-medium ${BASE_UI.transition} whitespace-nowrap ${BASE_UI.flexCenter} border-white/[0.05] border-l
      ${isLifetime ? "row-span-2" : ""}
      ${isActive 
        ? "bg-vert text-bg1 shadow-[0_0_15px_rgba(30,215,96,0.2)]" 
        : "text-gray-400 hover:text-white hover:bg-white/5"}
    `
  }
};

const CardWrapper = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-[32px] bg-white/[0.02] border border-white/5 ${className}`}>
    {children}
  </div>
);

export default function UserStatsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [range, setRange] = useState('year');
  const [offset, setOffset] = useState(0);
  const [extendedStats, setExtendedStats] = useState(INITIAL_STATS);
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

  if (loading) return <DashboardSkeleton/>

  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        
        {/* --- BARRE DE NAVIGATION ET FILTRES --- */}
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

            <MetricSwitch value={metric} onChange={setMetric}/>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center gap-1">
            <IntervalsSelector range={range} onIntervalChange={onIntervalChange}/>
            <div className="flex gap-8">
              <button className="uppercase font-bold text-md text-gray-300" onClick={decreaseInterval}>-</button>
              <button className="uppercase font-bold text-md text-gray-300" onClick={increaseInterval}>+</button>
            </div>
            
            <div className={STYLES.inputs.container}>
              <Calendar size={16} className="text-vert"/>
              <input type="date" value={startDate} className={STYLES.inputs.date} 
                onChange={(e) => { onIntervalChange(e.target.value); setRange("custom"); }}/>
              <span className="text-gray-600">→</span>
              <input type="date" value={endDate} className={STYLES.inputs.date}
                onChange={(e) => { onIntervalChange(e.target.value); setRange("custom"); }}/>
            </div>
          </div>
        </div>

        <div className={STYLES.grid.container}>
          {/* --- SECTION 1 : ACTIVITÉ --- */}
          <AccordionItem id="activite" title="Activité"
            isOpen={activeTab === "activite"} onClick={() => setActiveTab("activite")}
            icon={<Timer className="text-vert" />}
          >
            <div className={STYLES.grid.stats}>
              <CompactStatCard label="Temps d'écoute" value={`${formatter.format(parseFloat(extendedStats.totalTime.replace(" ","")))} min`} icon={<Timer size={32} className="text-vert"/>}/>
              <CompactStatCard label="Streams" value={formatter.format(parseFloat(extendedStats.totalStreams))} icon={<Play size={32} className="text-vert"/>}/>
              <CompactStatCard label="Engagement" value={extendedStats.ratio} icon={<Percent size={32} className="text-vert"/>}/>
            </div>
            <CumulativeChart data={extendedStats.cumulativeData} metric={metric}/>
          </AccordionItem>

          {/* --- SECTION 2 : DIVERSITÉ --- */}
          <AccordionItem id="diversite" title="Bibliothèque"
            isOpen={activeTab === "diversite"} onClick={() => setActiveTab("diversite")}
            icon={<Disc className="text-blue-400" />}
          >
            <div className={STYLES.grid.stats}>
              <CompactStatCard label="Musiques" value={formatter.format(extendedStats.uniqueTracks)} icon={<Music2 size={32} className="text-blue-400"/>}/>
              <CompactStatCard label="Albums" value={formatter.format(extendedStats.uniqueAlbums)} icon={<Disc size={32} className="text-blue-400"/>}/>
              <CompactStatCard label="Artistes" value={formatter.format(extendedStats.uniqueArtists)} icon={<Mic2 size={32} className="text-blue-400"/>}/>
            </div>
            <CardWrapper className="mt-12 p-8 h-64 flex items-center justify-center border-dashed">
               <p className="text-gray-500 italic">Analyse de la collection bientôt disponible</p>
            </CardWrapper>
          </AccordionItem>

          {/* --- SECTION 3 : HABITUDES --- */}
          <AccordionItem id="habitudes" title="Habitudes"
            isOpen={activeTab === "habitudes"} onClick={() => setActiveTab("habitudes")}
            icon={<Zap className="text-purple-400" />}
          >
            <div className={STYLES.grid.habits(range)}>
              <CompactStatCard label="Heure de pointe" value={extendedStats.peakHour} icon={<Clock className="text-purple-400" size={32}/>}/>
              <CompactStatCard label="Jour favori" value={extendedStats.peakDay} icon={<CalendarIcon className="text-purple-400" size={32}/>}/>
              {["season","3m","half","6m","year","1y","lifetime"].includes(range) && 
                <CompactStatCard label="Mois musical" value={extendedStats.peakMonth} icon={<CalendarDays className="text-purple-400" size={32}/>} />
              }
            </div>
            <div className={STYLES.grid.habits(range)}>
              <ClockChart data={extendedStats.clockData} metric={metric}/>
              <WeeklyChart data={extendedStats.weeklyData} metric={metric}/>
              {["half","6m","year","1y","lifetime"].includes(range) && 
                <MonthlyChart data={extendedStats.monthlyData} metric={metric}/>
              }
            </div>
          </AccordionItem>
        </div>
      </div>
    </main>
  );
}

function AccordionItem({ id, title, isOpen, onClick, icon, children }: any) {
  return (
    <div onClick={onClick} className={COMPONENT_STYLES.accordion.item(isOpen)}>
      {/* Label Vertical (Fermé) */}
      <div className={COMPONENT_STYLES.accordion.titleVertical(isOpen)}>
        <span className="rotate-[-90deg] whitespace-nowrap text-gray-500 font-bold uppercase tracking-[0.2em] text-sm flex items-center gap-3">
          {icon} {title}
        </span>
      </div>

      {/* Contenu (Ouvert) */}
      <div className={COMPONENT_STYLES.accordion.content(isOpen)}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-white/5">{icon}</div>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="flex flex-col gap-8">{children}</div>
      </div>
    </div>
  );
}

function CompactStatCard({ icon, label, value, subValue }: any) {
  return (
    <div className={COMPONENT_STYLES.statCard.base}>
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <p className={COMPONENT_STYLES.statCard.label}>{label}</p>
          <p className={COMPONENT_STYLES.statCard.value}>{value}</p>
          {subValue && <p className="text-xs text-gray-400 font-medium">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

const IntervalsSelector = ({ range, onIntervalChange }: {range:string, onIntervalChange:(interval:string)=>void}) => {
  const topRow = [
    { id: 'today', label: "Aujourd'hui" },
    { id: 'week', label: "Cette semaine" },
    { id: 'month', label: "Ce mois-ci" },
    { id: 'season', label: "Cette saison" },
    { id: 'half', label: "Biannuel" },
    { id: 'year', label: "Année civile" }
  ];

  const bottomRow = [
    { id: '24h', label: "24 heures" },
    { id: '7d', label: "Semaine" },
    { id: '1m', label: "30 jours" },
    { id: '3m', label: "3 mois" },
    { id: '6m', label: "6 mois" },
    { id: '1y', label: "1 an" }
  ];

  return (
    <div className={COMPONENT_STYLES.selector.container}>
      <div className="grid grid-cols-[repeat(6,auto)_auto] items-stretch">
        {topRow.map((item) => (
          <button key={item.id} onClick={() => onIntervalChange(item.id)}
            className={`${COMPONENT_STYLES.selector.btn(range === item.id)} border-b`}
          >{item.label}</button>
        ))}
        
        <button onClick={() => onIntervalChange("lifetime")}
          className={COMPONENT_STYLES.selector.btn(range === "lifetime", true)}
        >Lifetime</button>

        {bottomRow.map((item) => (
          <button key={item.id} onClick={() => onIntervalChange(item.id)}
            className={COMPONENT_STYLES.selector.btn(range === item.id)}
          >{item.label}</button>
        ))}
      </div>
    </div>
  );
};