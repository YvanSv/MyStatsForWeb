import { useLanguage } from "@/app/context/languageContext";
import { Clock, Play } from "lucide-react";

interface MetricSwitchProps {
  value: 'streams' | 'minutes';
  onChange: (newValue: 'streams' | 'minutes') => void;
}

export const MetricSwitch = ({ value, onChange }: MetricSwitchProps) => {
  const { t } = useLanguage();
  return (
    <div className="inline-flex p-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
      <button
        type="button" aria-label={t.dashboard.metricMinutes} aria-pressed={value === 'minutes'}
        onClick={() => onChange('minutes')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          value === 'minutes' ? 'bg-vert text-black shadow-lg shadow-vert/20' 
            : 'text-gray-400 hover:text-white'
        }`}
      ><Clock size={16}/></button>
      <button
        type="button" aria-label={t.dashboard.metricStreams} aria-pressed={value === 'streams'}
        onClick={() => onChange('streams')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          value === 'streams' ? 'bg-vert text-black shadow-lg shadow-vert/20' 
            : 'text-gray-400 hover:text-white'
        }`}
      ><Play size={16}/></button>
    </div>
  );
};