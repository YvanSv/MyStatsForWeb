import type { StatWidgetSettings } from "../../interfaces";
import { SettingLabel } from "../SettingLabel";
import { useId } from "react";
import { useLanguage } from "../../../context/languageContext";

/** Met à jour un réglage d'un widget de statistiques (la valeur suit la clé). */
export type StatUpdate = <K extends keyof StatWidgetSettings>(key: K, value: StatWidgetSettings[K]) => void;

export function ShortenFilter({update,settings}:{update: StatUpdate, settings?: StatWidgetSettings}) {
  const { t } = useLanguage();
  return (
    <button type="button" aria-pressed={!!settings?.shorten} onClick={() => update('shorten', !settings?.shorten)}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
    >{t.resume.wShorten}
      <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.shorten ? 'bg-vert' : 'bg-white/20'}`}>
        <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.shorten ? 'translate-x-3' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}

export function ShowIconFilter({update,settings}:{update: StatUpdate, settings?: StatWidgetSettings}) {
  const { t } = useLanguage();
  return (
    <button type="button" aria-pressed={!!settings?.showIcon} onClick={() => update('showIcon', !settings?.showIcon)}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
    >
      {t.resume.wShowIcon}
      <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.showIcon ? 'bg-vert' : 'bg-white/20'}`}>
        <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.showIcon ? 'translate-x-3' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}

export function CustomLabel({update,settings,defaultLabel}:{update: StatUpdate, settings?: StatWidgetSettings, defaultLabel?: string}) {
  const id = useId();
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-2">
      <SettingLabel htmlFor={id}>{t.resume.wWidgetTitle}</SettingLabel>
      <input 
        id={id}
        type="text" 
        value={settings?.label || ""} 
        placeholder={defaultLabel}
        onChange={(e) => update('label', e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-vert outline-none"
      />
    </div>
  );
}