import Widget from "./Widget";

interface UserProfileData {
  display_name: string;
  avatar: string;
  bio: string;
  banner: string;
  perms: any[];
}

interface ProfileWidgetProps {
  w: number;
  h: number;
  user: UserProfileData;
  settings: any;
}

export function ProfilePictureWidget({ w, h, user, settings }: ProfileWidgetProps) {
  const isRound = settings?.round ?? false;
  const hasBorder = settings?.border ?? false;
  const zoom = settings?.zoom ?? 1;

  const layouts = {
    "1x1": (
      <img 
        src={user.avatar || undefined} 
        alt="Avatar" 
        style={{ transform: `scale(${zoom})` }} // Gestion du zoom
        className={`w-full h-full object-cover transition-all duration-500 
          ${isRound ? 'rounded-full' : 'rounded-xl'} 
          ${hasBorder ? 'border-2 border-vert' : 'border-0'}`
        }
      />
    ),
  };

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}

export function ProfilePictureSettings({ settings, onChange }: { settings: any, onChange: (s: any) => void }) {
  // Fonction utilitaire pour simplifier les changements
  const update = (key: string, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* SECTION FORME */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Style</label>
        
        {/* Toggle Arrondi */}
        <button 
          onClick={() => update('round', !settings.round)}
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-[10px] font-bold"
        >
          Photo Arrondie
          <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.round ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.round ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Toggle Bordure */}
        <button 
          onClick={() => update('border', !settings.border)}
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-[10px] font-bold"
        >
          Bordure MyStats
          <div className={`w-7 h-4 rounded-full p-0.5 transition-all ${settings?.border ? 'bg-vert' : 'bg-white/20'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${settings?.border ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>

      {/* SECTION ZOOM */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Zoom Image</label>
          <span className="text-[10px] font-mono text-vert">{Math.round((settings?.zoom || 1) * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0.5" 
          max="2" 
          step="0.01"
          value={settings?.zoom || 1}
          onChange={(e) => update('zoom', parseFloat(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-vert"
        />
      </div>
    </div>
  );
}