import { useId } from "react";

const PROFILE_EDIT_STYLES = {
  TOGGLE_CARD: (disabled:boolean) => `flex items-center justify-between ${disabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`,
  TOGGLE_LABEL: `text1 text-sm font-medium`,
  TOGGLE_DESC: `text3 text-xs`,
  TOGGLE_SWITCH: "w-12 h-6 rounded-full relative cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-white/50 outline-none",
  TOGGLE_KNOB: "absolute right-1 top-1 w-4 h-4 bg-white rounded-full",
};

export function OptionToggle({title,description,active,onChange,disabled}:{title:string;description:string;active?:boolean;onChange:(value:boolean)=>void;disabled?:boolean}) {
  const id = useId();
  return (
    <div className={PROFILE_EDIT_STYLES.TOGGLE_CARD(!!disabled)}>
      <div>
        <p id={`${id}-title`} className={PROFILE_EDIT_STYLES.TOGGLE_LABEL}>{title}</p>
        <p className={PROFILE_EDIT_STYLES.TOGGLE_DESC}>{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={!!active} aria-labelledby={`${id}-title`} disabled={!!disabled}
        className={`
        ${PROFILE_EDIT_STYLES.TOGGLE_SWITCH} 
        transition-colors duration-200
        ${active ? 'bg-vert' : 'bg-white/10'}
      `} onClick={() => !disabled && onChange(!active)}>
        <div className={`
          ${PROFILE_EDIT_STYLES.TOGGLE_KNOB}
          transition-transform duration-200 ease-in-out
          ${active ? 'translate-x-0' : '-translate-x-6'}
        `}/>
      </button>
    </div>
  );
}