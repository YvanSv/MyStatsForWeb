import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarAngleAxis, PolarGrid, Radar } from 'recharts';

const CustomBar = (props: any) => {
  const { x, y, width, height, value } = props;

  // Si la valeur est 0 ou si le calcul échoue, on évite d'afficher
  if (!height || height < 0) return null;

  const radius = 6;
  const fill = value > 0 ? '#c084fc' : '#ffffff10';

  return (
    <rect
      x={x}
      y={y}           // Le point de départ vertical (en haut de la barre)
      width={width}   // La largeur calculée par Recharts
      height={height} // La hauteur calculée par Recharts (distance entre y et la ligne de base)
      fill={fill}
      rx={radius}
      ry={radius}
    />
  );
};

function CustomTooltip({label, value, metric}:any) {
  const unit = metric === 'streams' ? 'streams' : 'minutes';
  return (
    <div className="bg-gray-950 border border-white/10 px-3 py-2 rounded-xl shadow-2xl backdrop-blur-md">
      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">{label}</p>
      <p className="text-white font-mono font-bold text-sm">
        {value} <span className="text-purple-400 text-[10px]">{unit}</span>
      </p>
    </div>
  );
}

const BarTooltip = ({ active, payload, metric }: any) => {
  if (active && payload && payload.length)
    return <CustomTooltip label={payload[0].payload.month || payload[0].payload.day} value={payload[0].value} metric={metric}/>
  return null;
};

const ClockTooltip = ({ active, payload, metric }: any) => {
  if (active && payload && payload.length)
    return <CustomTooltip label={payload[0].payload.hour} value={payload[0].value} metric={metric}/>
  return null;
};

function CustomBarChart({data,type,metric}:{data:any[],type:string,metric: 'streams' | 'minutes'}) {
  const title = type === "day" ? "Activité hebdomadaire" : "Activité mensuelle"
  return (
    <div className="h-[300px] w-full bg-white/[0.02] rounded-3xl p-6 border border-white/10 flex flex-col">
      <h3 className="text-gray-400 text-xs font-bold uppercase px-2">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
          barGap={0}
        >
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#ffffff05" />
          <XAxis dataKey={type} axisLine={false} tickLine={false} tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 600 }} dy={10}/>
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4B5563', fontSize: 10 }}/>
          <Tooltip content={<BarTooltip metric={metric}/>} cursor={{ fill: 'white', fillOpacity: 0.05 }}/>
          <Bar dataKey={metric === 'streams' ? 'streams' : 'value'} shape={<CustomBar />} barSize={24} animationDuration={1500} animationEasing="ease-out"/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyChart({ data, metric }: { data: any[], metric: 'streams' | 'minutes' }) {
  return <CustomBarChart data={data} type="day" metric={metric}/>;
};

export function MonthlyChart({ data, metric }: { data: any[], metric: 'streams' | 'minutes' }) {
  return <CustomBarChart data={data} type="month" metric={metric}/>;
};

const formatTicks = (hour: string) => {
  const keys = ["0h", "6h", "12h", "18h"];
  return keys.includes(hour) ? hour : "";
};

export function ClockChart({ data, metric = 'streams' }: { data: any[], metric: 'streams' | 'minutes' }) {
  return (
    <div className="h-[300px] w-full bg-white/[0.02] rounded-3xl p-4 border border-white/10">
      <h3 className="text-gray-400 text-xs font-bold uppercase px-2">Activité horaire</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data} startAngle={90} endAngle={-270}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="hour" tickFormatter={formatTicks} tick={{ fill: '#9CA3AF', fontSize: 10 }}/>
          <Tooltip content={<ClockTooltip metric={metric}/>} cursor={{ stroke: '#c084fc', strokeWidth: 1 }} />
          <Radar name={metric === 'streams' ? 'Streams' : 'Minutes'} dataKey={metric === 'streams' ? 'streams' : 'value'} stroke="#c084fc"
            fill="#6d4e8c" fillOpacity={0.5} animationDuration={1000}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeChart({ data, metric }: { data: any[], metric: 'minutes' | 'streams' }) {
  const isMinutes = metric === 'minutes';
  const color = '#1DD05D';

  return (
    <div className="h-[400px] w-full bg-white/[0.02] rounded-3xl p-6 border border-white/10 mt-8">
      <h3 className="text-gray-400 text-xs font-bold uppercase mb-6">Évolution cumulée ({metric})</h3>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
          
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#4B5563', fontSize: 10 }}
            minTickGap={30}
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#030712', borderRadius: '12px', border: '1px solid #ffffff10' }}
            itemStyle={{ color: color }}
          />
          
          <Area 
            type="monotone" 
            dataKey={metric} 
            stroke={color} 
            fillOpacity={1} 
            fill="url(#colorArea)" 
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}