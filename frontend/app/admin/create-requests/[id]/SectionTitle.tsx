import type { ComponentType } from "react";

/** Titre de section avec icône et filet inférieur. */
export default function SectionTitle({ icon: Icon, title }: { icon: ComponentType<{ className?: string }>, title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
      <Icon className="w-5 h-5 text-vert" />
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
    </div>
  );
}
