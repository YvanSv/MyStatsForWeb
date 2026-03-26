export function ShortenFilter({update,settings}:{update: (type:string,value:any) => void, settings: any}) {
  return (
    <button onClick={() => update('shorten', !settings.shorten)}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
    >Abréger (1.2M)
      <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.shorten ? 'bg-vert' : 'bg-white/20'}`}>
        <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.shorten ? 'translate-x-3' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}

export function ShowIconFilter({update,settings}:{update: (type:string,value:any) => void, settings: any}) {
  return (
    <button onClick={() => update('showIcon', !settings.showIcon)}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold"
    >
      Afficher l'icône
      <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.showIcon ? 'bg-vert' : 'bg-white/20'}`}>
        <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.showIcon ? 'translate-x-3' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}

export function CustomLabel({update,settings}:{update: (type:string,value:any) => void, settings: any}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Titre du widget</label>
      <input 
        type="text" 
        value={settings.label || ""} 
        onChange={(e) => update('label', e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-vert outline-none"
      />
    </div>
  );
}