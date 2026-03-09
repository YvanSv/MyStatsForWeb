const BASE_UI = {
  glass: "bg-white/[0.02] border border-white/5",
  glassHover: "hover:bg-white/[0.05] hover:border-white/10 transition-all",
};

const COMPONENT_STYLES = {
  statCard: {
    base: `px-5 py-3 rounded-2xl ${BASE_UI.glass} ${BASE_UI.glassHover} group`,
    label: "text-xs text-gray-500 uppercase font-bold",
    value: "text-xl font-bold",
  },
};

export default function CompactStatCard({ icon, label, value, subValue }: any) {
  return (
    <div className={COMPONENT_STYLES.statCard.base}>
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <p className={COMPONENT_STYLES.statCard.label}>{label}</p>
          <p className={COMPONENT_STYLES.statCard.value}>{value}</p>
          {subValue && <p className="text-xs text-gray-400 font-medium">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}