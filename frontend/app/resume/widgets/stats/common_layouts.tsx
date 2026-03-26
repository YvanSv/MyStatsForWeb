import { formatNumber } from "./utils";

export function Layout1x1({data,settings,icon}:{data:any,settings:any,icon:any}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center rounded-xl">
      {settings?.showIcon && icon}
      <span className="text-sm font-black tracking-tighter text-white leading-none">
        {formatNumber(data,settings.shorten)}
      </span>
      <span className="text-[7px] uppercase font-bold text-gray-500 tracking-widest mt-1">{settings?.label}</span>
    </div>
  );
}

export function Layout2x1({data,settings,icon}:{data:any,settings:any,icon:any}) {
  const color = settings?.color || "#1DB954";
  return (
    <div className="w-full h-full flex items-center justify-between px-3 rounded-xl">
      <div className="flex flex-col">
        <span className="text-[8px] uppercase font-black text-gray-500 tracking-[0.2em] mb-1">{settings?.label}</span>
        <span className="text-xl font-black italic leading-none" style={{ color }}>{formatNumber(data,settings.shorten)}</span>
      </div>
      {settings?.showIcon && icon}
    </div>
  );
}

export function Layout2x2({data,settings,icon}:{data:any,settings:any,icon:any}) {
  const color = settings?.color || "#1DB954";
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
      {settings?.showIcon && icon}
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2 italic">
        {settings?.label}
      </span>
      <span className="text-4xl font-black italic tracking-tighter leading-none mb-1" style={{ color }}>
        {formatNumber(data,settings.shorten)}
      </span>
      <div className="h-1 w-12 rounded-full" style={{ backgroundColor: color }} />
    </div>
  );
}