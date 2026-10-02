/** Pastille libellé + valeur (« — » quand la valeur est vide). */
export default function InfoBubble({ label, value }: { label: string, value: string | number | undefined }) {
  return (
    <div className="bg-bg2 p-3 rounded-lg border border-white/5">
      <div className="text-xs text3 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-white font-medium">{value || "—"}</div>
    </div>
  );
}
