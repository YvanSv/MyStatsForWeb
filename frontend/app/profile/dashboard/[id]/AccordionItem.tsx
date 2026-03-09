const BASE_UI = {
  glass: "bg-white/[0.02] border border-white/5",
  glassHover: "hover:bg-white/[0.05] hover:border-white/10 transition-all",
  flexCenter: "flex items-center justify-center",
  transition: "transition-all duration-300 ease-in-out",
};

const COMPONENT_STYLES = {
  accordion: {
    item: (isOpen: boolean) => `
      relative overflow-hidden ${BASE_UI.transition} ${BASE_UI.glass} [&:not(:first-child)]:border-l
      ${isOpen ? "flex-[20] bg-white/[0.04] shadow-2xl" : `flex-[1] ${BASE_UI.glassHover} cursor-pointer`}
    `,
    titleVertical: (isOpen: boolean) => `
      absolute inset-0 ${BASE_UI.flexCenter} transition-all duration-500
      ${isOpen ? "opacity-0 invisible" : "opacity-100 visible"}
    `,
    content: (isOpen: boolean) => `
      p-8 h-full transition-opacity duration-500 delay-200
      ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}
    `,
  },
}

export default function AccordionItem({ id, title, isOpen, onClick, icon, children }: any) {
  return (
    <div onClick={onClick} className={COMPONENT_STYLES.accordion.item(isOpen)}>
      {/* Label Vertical (Fermé) */}
      <div className={COMPONENT_STYLES.accordion.titleVertical(isOpen)}>
        <span className="rotate-[-90deg] whitespace-nowrap text-gray-500 font-bold uppercase tracking-[0.2em] text-sm flex items-center gap-3">
          {icon} {title}
        </span>
      </div>

      {/* Contenu (Ouvert) */}
      <div className={COMPONENT_STYLES.accordion.content(isOpen)}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-white/5">{icon}</div>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="flex flex-col gap-8">{children}</div>
      </div>
    </div>
  );
}