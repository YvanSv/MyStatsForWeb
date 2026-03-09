const BASE_UI = {
  flexCenter: "flex items-center justify-center",
  transition: "transition-all duration-300 ease-in-out",
};

const COMPONENT_STYLES = {
  selector: {
    container: "flex bg-white/[0.03] border border-white/10 rounded-xl shadow-inner overflow-hidden",
    btn: (isActive: boolean, isLifetime = false) => `
      px-3 py-2 text-xs font-medium ${BASE_UI.transition} whitespace-nowrap ${BASE_UI.flexCenter} border-white/[0.05] border-l
      ${isLifetime ? "row-span-2" : ""}
      ${isActive 
        ? "bg-vert text-bg1 shadow-[0_0_15px_rgba(30,215,96,0.2)]" 
        : "text-gray-400 hover:text-white hover:bg-white/5"}
    `
  }
}

export default function IntervalsSelector({ range, onIntervalChange }: {range:string, onIntervalChange:(interval:string)=>void}) {
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