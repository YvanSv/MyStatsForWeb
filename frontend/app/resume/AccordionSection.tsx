import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Si fourni, le bouton d'en-tête est placé dans un titre de ce niveau (navigation par titres). */
  headingLevel?: 2 | 3;
  /** Hauteur maximale du panneau ouvert (classe Tailwind) : l'animation d'ouverture en a besoin. */
  openMaxHeightClass?: string;
  /**
   * Mode « défilement interne » : la section s'adapte à la hauteur que lui laisse son parent (flex colonne)
   * et c'est son panneau, pas la page, qui défile ; l'en-tête reste fixe. Remplace openMaxHeightClass.
   */
  scrollPanel?: boolean;
}

/** Section pliable : bouton avec aria-expanded/aria-controls, chevron, panneau inerte quand il est fermé. */
export function AccordionSection({ title, children, defaultOpen = false, headingLevel, openMaxHeightClass = "max-h-[500px]", scrollPanel = false }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  const button = (
    <button
      type="button" aria-expanded={isOpen} aria-controls={panelId}
      onClick={() => setIsOpen(!isOpen)}
      className="w-full shrink-0 flex items-center justify-between py-3 px-1 hover:text-white transition-colors group"
    >
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-300 italic">
        {title}
      </span>
      <ChevronDown
        size={14} aria-hidden="true"
        className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
  const panelClass = scrollPanel
    ? `min-h-0 px-1 custom-scrollbar transition-opacity duration-300 ${isOpen ? 'overflow-y-auto opacity-100 mb-4' : 'max-h-0 overflow-hidden opacity-0'}`
    : `overflow-hidden px-1 transition-all duration-300 ease-in-out ${isOpen ? `${openMaxHeightClass} opacity-100 mb-4` : 'max-h-0 opacity-0'}`;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className={`border-b border-white/5 last:border-none ${scrollPanel ? 'flex flex-col min-h-0' : ''}`}>
      {headingLevel ? <Heading className="shrink-0">{button}</Heading> : button}

      <div id={panelId} inert={!isOpen} className={panelClass}>
        <div className="flex flex-col gap-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}
