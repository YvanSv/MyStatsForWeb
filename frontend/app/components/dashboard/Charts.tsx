import { useLanguage } from '@/app/context/languageContext';
import { CHART_HEIGHT_DESKTOP, CHART_HEIGHT_MOBILE, COLORS, DESKTOP_BREAKPOINT } from '@/app/constants/ui';
import { useId, useLayoutEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarAngleAxis, PolarGrid, Radar, PolarRadiusAxis } from 'recharts';
import { LineChart, Line, Legend } from 'recharts';

// new Date("YYYY-MM-DD") est interprété en UTC puis affiché en heure locale : dans un fuseau négatif
// on obtiendrait la veille. Une date sans heure est donc construite directement en heure locale.
const parseChartDate = (value: string | number) => {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
};

// Largeur de la fenêtre, mise à jour au redimensionnement.
// Valeur initiale « desktop » (rendu serveur sûr), remplacée par la mesure réelle avant la première peinture : pas de saut visible.
function useScreenWidth(initial = 1280) {
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return width;
}

// Hauteur (px) de la barre discrète affichée pour une valeur nulle
const MIN_BAR_HEIGHT = 3;

// Vrai quand aucune des clés ne porte de valeur non nulle (ou quand il n'y a aucune donnée)
const hasNoData = (data: Record<string, unknown>[] | undefined, keys: string[]) =>
  !data?.length || !data.some(row => keys.some(key => Number(row?.[key]) > 0));

const CustomBar = (props: any) => {
  const { x, y, width, height, value } = props;
  if (value === 0) {
    // Valeur nulle : la hauteur calculée est nulle, on dessine une petite barre discrète posée sur la ligne de base
    return (<rect x={x} y={(y ?? 0) - MIN_BAR_HEIGHT} width={width} height={MIN_BAR_HEIGHT} fill="#ffffff10" rx={1.5} ry={1.5}/>);
  }
  if (!height || height < 0) return null;
  return (<rect x={x} y={y} width={width} height={height} fill={value > 0 ? COLORS.PURPLE : '#ffffff10'} rx={6} ry={6}/>);
};

const ChartToolTip = ({ active, payload }: any) => {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  const rawDate = data.full_date || data.date || data.hour || data.day || data.month || data.year;
  
  // Formatage de date dynamique selon la langue
  const formattedDate = rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
    ? parseChartDate(rawDate).toLocaleDateString(t.common.locale, {day:'2-digit', month:'2-digit', year:'numeric'})
    : rawDate;
    
  const formatter = new Intl.NumberFormat(t.common.locale, { maximumFractionDigits: 0 });

  return (
    <div className="bg-gray-950/90 border border-white/10 px-3 py-2 rounded-xl shadow-2xl backdrop-blur-md min-w-[120px]">
      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-2 pb-1 border-b border-white/5">
        {formattedDate}
      </p>
      
      <div className="flex flex-col gap-1">
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white font-mono font-bold text-sm flex items-center justify-between gap-4">
            <span>{formatter.format(entry.value)}</span>
            <span className="text-[10px] uppercase tracking-tighter opacity-80"
              style={{ color: entry.color || entry.fill }}
            >
              {/* Traduction dynamique du nom de la métrique */}
              {entry.name === "value" || entry.name === "minutes" ? t.common.minutes : 
               entry.name === "streams" ? t.common.streams : 
               entry.name === "tracks" ? t.common.tracks :
               entry.name === "albums" ? t.common.albums :
               entry.name === "artists" ? t.common.artists : entry.name}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
};

function CustomBarChart({data, type, metric}:{data:any[], type:string, metric: 'streams' | 'minutes'}) {
  const { t } = useLanguage();
  const screenWidth = useScreenWidth();
  
  // Titre dynamique
  const title = type === "day" ? t.charts.weekly : type === "month" ? t.charts.monthly : t.charts.annual;
  
  return (
    <GraphContainer height={screenWidth < DESKTOP_BREAKPOINT ? CHART_HEIGHT_MOBILE : CHART_HEIGHT_DESKTOP} title={title} additional={"flex flex-col"} empty={hasNoData(data, [metric === 'streams' ? 'streams' : 'value'])}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barGap={0}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#ffffff05" />
          <XAxis dataKey={type} axisLine={false} tickLine={false} tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 600 }} dy={10}/>
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4B5563', fontSize: 10 }} tickFormatter={(str) => {
            const formatter = new Intl.NumberFormat(t.common.locale, {maximumFractionDigits: 0});
            return formatter.format(str);
          }} width={65}/>
          <Tooltip content={<ChartToolTip/>} cursor={{ fill: COLORS.PURPLE, fillOpacity: 0.05 }}/>
          <Bar dataKey={metric === 'streams' ? 'streams' : 'value'} fill={COLORS.PURPLE} shape={<CustomBar />} barSize={24} animationDuration={1500} animationEasing="ease-out"/>
        </BarChart>
    </GraphContainer>
  );
}

export function WeeklyChart({ data, metric }: { data: any[], metric: 'streams' | 'minutes' }) {
  return <CustomBarChart data={data} type="day" metric={metric}/>;
};

export function MonthlyChart({ data, metric }: { data: any[], metric: 'streams' | 'minutes' }) {
  return <CustomBarChart data={data} type="month" metric={metric}/>;
};

export function AnnualChart({ data, metric }: { data: any[], metric: 'streams' | 'minutes' }) {
  return <CustomBarChart data={data} type="year" metric={metric}/>;
};

const formatTicks = (hour: string) => {
  const keys = ["0h", "6h", "12h", "18h"];
  return keys.includes(hour) ? hour : "";
};

export function ClockChart({ data, metric = 'streams', daysCount = 0 }: { data: any[], metric?: 'streams' | 'minutes', daysCount?: number}) {
  const { t } = useLanguage();
  const screenWidth = useScreenWidth();

  const maxRange = metric === 'minutes' && daysCount !== 0 ? 60 * daysCount : undefined;
  return (
    <GraphContainer height={screenWidth < DESKTOP_BREAKPOINT ? CHART_HEIGHT_MOBILE : CHART_HEIGHT_DESKTOP} title={t.charts.hourly} empty={hasNoData(data, [metric === 'streams' ? 'streams' : 'value'])}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data} startAngle={90} endAngle={-270}>
        <PolarGrid stroke="#374151"/>
        <PolarAngleAxis dataKey="hour" tickFormatter={formatTicks} tick={{ fill: '#9CA3AF', fontSize: 10 }}/>
        <PolarRadiusAxis domain={[0, maxRange || 'auto']} tick={false} axisLine={false}/>
        <Tooltip content={<ChartToolTip/>} cursor={{ stroke: COLORS.PURPLE, strokeWidth: 1 }}/>
        <Radar 
          name={metric === 'streams' ? t.common.streams : t.common.minutes} 
          dataKey={metric === 'streams' ? 'streams' : 'value'} 
          stroke={COLORS.PURPLE}
          fill="#5e4d6c" fillOpacity={0.5} animationDuration={1000}
        />
      </RadarChart>
    </GraphContainer>
  );
}

export function CumulativeChart({ data }:{ data: any[] }) {
  const { t } = useLanguage();
  const color1 = COLORS.SPOTIFY_GREEN_LIGHT, color2 = COLORS.SPOTIFY_GREEN_DARK;
  // Ids de dégradé uniques par instance (les « : » de useId sont inutilisables dans url(#...))
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id1 = `colorArea1-${gradientId}`, id2 = `colorArea2-${gradientId}`;
  return (
    <GraphContainer height={CHART_HEIGHT_DESKTOP} title={t.charts.cumulative} empty={hasNoData(data, ['minutes', 'streams'])}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
        <defs>
          <linearGradient id={id1} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color1} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color1} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id={id2} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color2} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color2} stopOpacity={0}/>
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <GraphXAxis data={"date"}/>
        <GraphYAxis/>
        <GraphLegend/>
        <Tooltip content={<ChartToolTip/>} cursor={{ stroke: color1, strokeWidth: 1 }}/>
        <Area type="monotone" dataKey={"minutes"} stroke={color1} fillOpacity={1} fill={`url(#${id1})`} strokeWidth={2} dot={false}/>
        <Area type="monotone" dataKey={"streams"} stroke={color2} fillOpacity={1} fill={`url(#${id2})`} strokeWidth={2} dot={false}/>
      </AreaChart>
    </GraphContainer>
  );
}

export const EvolutionChart = ({ data }:{data: any[]}) => {
  const { t } = useLanguage();
  const color1 = COLORS.SPOTIFY_GREEN, color2 = "#60a5fa", color3 = "#a78bfa";
  return (
    <GraphContainer height={300} title={t.charts.discoveries} empty={hasNoData(data, ['tracks', 'albums', 'artists'])}>
      <LineChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <Tooltip content={<ChartToolTip/>} cursor={{ stroke: color1, strokeWidth: 1 }}/>
        <GraphLegend/>
        <GraphXAxis data={"date"}/>
        <GraphYAxis/>
        <Line type="monotone" dataKey="tracks" name={t.common.tracks} stroke={color1} strokeWidth={3} dot={false}/>
        <Line type="monotone" dataKey="albums" name={t.common.albums} stroke={color2} strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="artists" name={t.common.artists} stroke={color3} strokeWidth={3} dot={false} />
      </LineChart>
    </GraphContainer>
  );
};

export const EvolutionStreamsChart = ({ data }:{data: any[]}) => {
  const { t } = useLanguage();
  const color1 = COLORS.SPOTIFY_GREEN_LIGHT, color2 = COLORS.SPOTIFY_GREEN_DARK;
  return (
    <GraphContainer height={280} title={t.charts.streamsEvolution} empty={hasNoData(data, ['minutes', 'streams'])}>
      <LineChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <GraphXAxis data={"date"}/>
        <GraphYAxis/>
        <GraphLegend/>
        <Tooltip content={<ChartToolTip/>} cursor={{ stroke: color1, strokeWidth: 1 }}/>
        <Line type="monotone" dataKey="minutes" name={t.common.minutes} stroke={`${color1}`} strokeWidth={3} dot={false}/>
        <Line type="monotone" dataKey="streams" name={t.common.streams} stroke={`${color2}`} strokeWidth={3} dot={false} />
      </LineChart>
    </GraphContainer>
  );
};

const GraphLegend = () => (
  <Legend iconType="circle" verticalAlign="top" height={36} align="right" wrapperStyle={{
      fontSize: "15px",
      textTransform: "uppercase",
    }}
    formatter={(value) => (<span className="font-bold ml-1 inline-flex items-center translate-y-[1px]">{value}</span>)}
  />
);

const GraphXAxis = ({data}:any) => {
  const { t } = useLanguage();
  return (
    <XAxis dataKey={data} tickLine={false} tick={{ fill: '#4B5563', fontSize: 10 }} minTickGap={30}
      tickFormatter={(str) => {
        const date = parseChartDate(str);
        return date.toLocaleDateString(t.common.locale, { day: '2-digit', month: '2-digit', year: '2-digit' });
      }}
    />
  );
};

const GraphYAxis = () => {
  const { t } = useLanguage();
  return (
    <YAxis tickLine={false} tick={{ fill: '#4B5563', fontSize: 10 }}
      tickFormatter={(str) => {
        const formatter = new Intl.NumberFormat(t.common.locale, {maximumFractionDigits: 0});
        return formatter.format(str);
      }}
    />
  );
};

function GraphContainer({children, height, title, additional, empty}:any) {
  const { t } = useLanguage();
  return (
    <div style={{ height: `${height}px` }} className={`flex flex-col w-full bg-white/[0.02] border border-white/5 px-2 py-4 md:p-4 rounded-2xl ${additional}`}>
      <h3 className={`text-gray-400 text-[9px] md:text-xs font-bold uppercase`}>{title}</h3>
      {empty ? (
        <div role="status" className="flex-1 min-h-0 w-full flex items-center justify-center text-gray-500 text-sm">
          {t.charts.empty}
        </div>
      ) : (
        <div className='flex-1 min-h-0 w-full'>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}