const COMPONENT_STYLES = {
  statCard: {
    base: ` px-1 lg:px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group`,
    label: "text-[7px] md:text-xs text-gray-500 uppercase font-bold",
    value: "text-xs md:text-md lg:text-xl font-bold",
  },
};

export default function CompactStatCard({ icon, label, value, subValue }: any) {
  return (
    <div className={COMPONENT_STYLES.statCard.base}>
      <div className="flex items-center gap-2 lg:gap-4">
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