import { Pointer } from "lucide-react";

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
      p-4 md:p-6 lg:p-8 h-full transition-opacity duration-500 delay-200
      ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}
    `,
    indicator: (isOpen: boolean) => `
      absolute transition-all duration-500 delay-300
      ${isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}
      
      /* Format Mobile (md et moins) : à gauche, centré verticalement */
      max-lg:left-4 max-lg:top-1/2 max-lg:-translate-y-1/2
      
      /* Format Desktop (lg et plus) : en bas, centré horizontalement */
      lg:bottom-8 lg:left-1/2 lg:-translate-x-1/2
    `,
  },
}

export default function AccordionItem({ title, isOpen, onClick, icon, children, switchOption }: any) {
  return (
    <div onClick={onClick} className={COMPONENT_STYLES.accordion.item(isOpen)}>
      {/* Label Vertical (Fermé) */}
      <div className={COMPONENT_STYLES.accordion.titleVertical(isOpen)}>
        <span className="lg:rotate-[-90deg] whitespace-nowrap text-gray-500 font-bold uppercase tracking-[0.2em] text-sm flex items-center gap-3">
          {icon} {title}
        </span>
      </div>

      {/* Indicateur de clic */}
      <div className={COMPONENT_STYLES.accordion.indicator(isOpen)}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5">
            <Pointer size={16} className={icon.props.className} />
          </div>
        </div>
      </div>

      {/* Contenu (Ouvert) */}
      <div className={COMPONENT_STYLES.accordion.content(isOpen)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-white/5">{icon}</div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {switchOption}
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}