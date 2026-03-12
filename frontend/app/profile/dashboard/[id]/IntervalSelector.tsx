import { AnimatePresence, motion } from "framer-motion";
import { Calendar1, CalendarDays, CalendarDaysIcon, Clock1, Flower2, Infinity } from "lucide-react";
import { useState } from "react";

const BASE_UI = {
  flexCenter: "flex items-center justify-center",
  transition: "transition-all duration-300 ease-in-out",
};

const COMPONENT_STYLES = {
  selector: {
    container: "flex bg-white/[0.03] border border-white/10 rounded-xl shadow-inner overflow-hidden",
    btn: (isActive: boolean, isLifetime = false) => `
      px-2 py-1 text-xs font-medium ${BASE_UI.transition} whitespace-nowrap ${BASE_UI.flexCenter} border-white/[0.05] border-l
      ${isLifetime ? "row-span-2" : ""}
      ${isActive 
        ? "bg-vert text-bg1 shadow-[0_0_15px_rgba(30,215,96,0.2)]" 
        : "text-gray-400 hover:text-white hover:bg-white/5"}
    `
  }
}

export default function IntervalsSelector({ range, onIntervalChange }: {range:string, onIntervalChange:(interval:string)=>void}) {
  const [isOpen, setIsOpen] = useState(true);

  const topRow = [
    { id: 'today', label: '24h', span: true },
    { id: 'week', label: '7j', span: true },
    { id: 'month', label: "Mois", span: false },
    { id: 'season', label: "Saison", span: true },
    { id: '6m', label: "6m", span: true },
    { id: 'year', label: "Année", span: true },
    { id: 'lifetime', label: <Infinity/>, span: true },
    { id: '1m', label: "30j", span: false },
  ];

  return (
    <div className={`${COMPONENT_STYLES.selector.container} mr-2`}>
      {/* BOUTON BASCULE */}
      <button onClick={() => setIsOpen(!isOpen)}
        className={`${COMPONENT_STYLES.selector.btn(false, true)} z-10`}
      >{isOpen ? '>' : '<'}</button>

      {/* CONTENU ANIMÉ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.4, ease: "circOut" }}
            className="overflow-hidden whitespace-nowrap"
          >
            <div className="grid grid-cols-[repeat(7,auto)] items-stretch">
              {topRow.map((item) => (
                <button key={item.id} onClick={() => onIntervalChange(item.id)}
                  className={`${COMPONENT_STYLES.selector.btn(range === item.id,item.span)} border-b`}
                >{item.label}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};