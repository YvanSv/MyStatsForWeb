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

export default function UserStatsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [range, setRange] = useState('year');
  const [offset, setOffset] = useState(0);
  const [extendedStats, setExtendedStats] = useState(INITIAL_STATS);
  const [activeTab, setActiveTab] = useState("activite");
  const [metric, setMetric] = useState<'streams' | 'minutes'>('minutes');
  const { getDashboard } = useProfile();

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
    <main className="min-h-screen bg-bg1 text-white pt-8 pb-16 px-3">
      <div className="mx-auto p-8">
        {/* --- BARRE DE NAVIGATION ET FILTRES --- */}
        <div className="flex flex-row gap-12 mb-6 justify-between">
          <div className="flex flex-row gap-12 items-center">
            {/* Bouton Retour */}
            <button 
              onClick={() => router.back()}
              className="flex gap-2 text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
              <span>Retour</span>
            </button>

            <header>
              <h1 className="text-4xl font-bold mb-2">Analyse Détaillée</h1>
              <p className="text-gray-400">Plongée profonde dans les habitudes d'écoute.</p>
            </header>

            <MetricSwitch value={metric} onChange={setMetric}/>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center gap-1">
            <IntervalsSelector range={range} onIntervalChange={onIntervalChange}/>
            <div className="flex gap-8">
              <button className="uppercase font-bold text-md text-gray-300" onClick={decreaseInterval}>-</button>
              <button className="uppercase font-bold text-md text-gray-300" onClick={increaseInterval}>+</button>
            </div>
            {/* Sélecteur de Dates Personnalisé */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Calendar size={16} className="text-vert" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => {
                  onIntervalChange(e.target.value);
                  setRange("custom"); // On désactive le bouton d'intervalle actif
                }}
                className="bg-transparent text-xs text-gray-300 outline-none cursor-pointer [color-scheme:dark]" 
              />
              <span className="text-gray-600">→</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => {
                  onIntervalChange(e.target.value);
                  setRange("custom");
                }}
                className="bg-transparent text-xs text-gray-300 outline-none cursor-pointer [color-scheme:dark]" 
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[400px] w-full items-stretch rounded-[32px] overflow-hidden">
          {/* --- SECTION 1 : ACTIVITÉ --- */}
          <AccordionItem id="activite" title="Activité"
            isOpen={activeTab === "activite"} onClick={() => setActiveTab("activite")}
            icon={<Timer className="text-vert" />} color="border-vert/20"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CompactStatCard label="Temps d'écoute" value={extendedStats.totalTime} icon={<Timer size={32} className="text-vert"/>}/>
              {/*subValue={`${extendedStats.avgTimePerDay} / jour`}*/}
              <CompactStatCard label="Streams" value={extendedStats.totalStreams} icon={<Play size={32} className="text-vert"/>}/>
              {/*subValue={`${extendedStats.avgStreamsPerDay} / jour`}*/}
              <CompactStatCard label="Engagement" value={extendedStats.ratio} icon={<Percent size={32} className="text-vert"/>}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <CumulativeChart data={extendedStats.cumulativeData} metric={metric}/>
            </div>
          </AccordionItem>

          {/* --- SECTION 2 : DIVERSITÉ --- */}
          <AccordionItem id="diversite" title="Bibliothèque"
            isOpen={activeTab === "diversite"} onClick={() => setActiveTab("diversite")}
            icon={<Disc className="text-blue-400" />} color="border-blue-400/20"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CompactStatCard label="Musiques" value={extendedStats.uniqueTracks} icon={<Music2 size={32} className="text-blue-400"/>}/>
              <CompactStatCard label="Albums" value={extendedStats.uniqueAlbums} icon={<Disc size={32} className="text-blue-400"/>}/>
              <CompactStatCard label="Artistes" value={extendedStats.uniqueArtists} icon={<Mic2 size={32} className="text-blue-400"/>}/>
            </div>
            <div className="mt-12 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 h-64 flex items-center justify-center border-dashed">
              <p className="text-gray-500 italic">Graphique d'activité hebdomadaire (Chart.js / Recharts à venir)</p>
            </div>
          </AccordionItem>

          {/* --- SECTION 3 : HABITUDES --- */}
          <AccordionItem id="habitudes" title="Habitudes"
            isOpen={activeTab === "habitudes"} onClick={() => setActiveTab("habitudes")}
            icon={<Zap className="text-purple-400" />} color="border-purple-400/20"
          >
            <div className={`gap-4 grid grid-cols-1 ${["season","3m","half","6m","year","1y","lifetime"].includes(range) ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              <CompactStatCard label={"Heure de pointe"} value={extendedStats.peakHour} icon={<Clock className="text-purple-400" size={32}/>}/>
              <CompactStatCard label={"Jour favori"} value={extendedStats.peakDay} icon={<CalendarIcon className="text-purple-400" size={32}/>}/>
              {["season","3m","half","6m","year","1y","lifetime"].includes(range) && <CompactStatCard label={"Mois musical"} value={extendedStats.peakMonth} icon={<CalendarDays className="text-purple-400" size={32}/>}/>}
            </div>
            <div className={`gap-4 grid grid-cols-1 ${["half","6m","year","1y","lifetime"].includes(range) ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              <ClockChart data={extendedStats.clockData} metric={metric}/>
              <WeeklyChart data={extendedStats.weeklyData} metric={metric}/>
              {["half","6m","year","1y","lifetime"].includes(range) && <MonthlyChart data={extendedStats.monthlyData} metric={metric}/>}
            </div>
          </AccordionItem>
        </div>
      </div>
    </main>
  );
}

function AccordionItem({ id, title, isOpen, onClick, icon, children }: any) {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden transition-all duration-300 ease-in-out bg-white/[0.02] [&:not(:first-child)]:border-l border-white/5
        ${isOpen ? `flex-[20] bg-white/[0.04] shadow-2xl` : "flex-[1] hover:bg-white/[0.05] cursor-pointer"}`}
    >
      {/* Titre vertical quand fermé / Horizontal quand ouvert */}
      <div className={`
        absolute inset-0 flex transition-all duration-500
        ${isOpen ? "opacity-0 invisible" : "opacity-100 visible"}
        items-center justify-center
      `}>
        <span className="rotate-[-90px] lg:rotate-[-90deg] whitespace-nowrap text-gray-500 font-bold uppercase tracking-[0.2em] text-sm flex items-center gap-3">
          {icon} {title}
        </span>
      </div>

      {/* Contenu interne */}
      <div className={`
        p-8 h-full transition-opacity duration-500 delay-200
        ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}
      `}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-white/5">{icon}</div>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="flex flex-col gap-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function CompactStatCard({ icon, label, value, subValue }: any) {
  return (
    <div className="px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {subValue && <p className="text-xs text-gray-400 font-medium">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

const IntervalsSelector = ({ range, onIntervalChange }: {range:string,onIntervalChange:(interval:string)=>void}) => {
  const getCurrentMonth = () => {
    const month = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date());
    return month.charAt(0).toUpperCase() + month.slice(1);
  };
  const getCurrentSeason = () => {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return "Printemps";
    if (month >= 5 && month <= 7) return "Été";
    if (month >= 8 && month <= 10) return "Automne";
    return "Hiver";
  };
  const getCurrentHalf = () => {
    const month = new Date().getMonth(); // 0-11
    if (month < 6) return "1ère moitié de l'année";
    else return "2ème moitié de l'année";
  };
  const getCurrentYear = () => { return new Date().getFullYear() };

  const getBtnClass = (id = "", isLifetime = false) => `
    px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap flex items-center justify-center border-white/[0.05] border-l
    ${isLifetime && "row-span-2"}
    ${range === id 
      ? "bg-vert text-bg1 shadow-[0_0_15px_rgba(30,215,96,0.2)]" 
      : "text-gray-400 hover:text-white hover:bg-white/5"}
  `;

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
    <div className="flex bg-white/[0.03] border border-white/10 rounded-xl shadow-inner overflow-hidden w-fit">
      <div className="grid grid-cols-[repeat(6,auto)_auto] items-stretch">
        {/* LIGNE DU HAUT */}
        {topRow.map((item, i) => (
          <button key={item.id} onClick={() => onIntervalChange(item.id)}
            className={`${getBtnClass(item.id)} border-b`}
          >{item.label}</button>
        ))}
        {/* BOUTON LIFETIME */}
        <button onClick={() => onIntervalChange("lifetime")}
          className={getBtnClass("lifetime", true)}
        >Lifetime</button>
        {/* LIGNE DU BAS */}
        {bottomRow.map((item, i) => (
          <button key={item.id} onClick={() => onIntervalChange(item.id)}
            className={`${getBtnClass(item.id)}`}
          >{item.label}</button>
        ))}
      </div>
    </div>
  );
};