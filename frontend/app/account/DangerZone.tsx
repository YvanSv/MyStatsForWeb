import type { ReactNode } from "react";

interface DangerButtonProps {
  onClick: () => void;
  className?: string;
  children: ReactNode;
}

export function DangerButton({ onClick, className = "", children }: DangerButtonProps) {
  return (
    <button type="button" onClick={onClick}
      className={`group flex flex-col items-center gap-3 transition-all duration-300 hover:opacity-80${className}`}
    >
      <div className="px-6 py-3 rounded-full border border-rouge/20 bg-rouge/5 text-rouge text-[11px] font-bold uppercase tracking-widest group-hover:bg-rouge group-hover:text-white transition-all">
        {children}
      </div>
    </button>
  );
}

interface Props {
  clearLabel: string;
  deleteLabel: string;
  note: string;
  onClear: () => void;
  onDelete: () => void;
}

// Zone de danger : nettoyage des données et suppression du compte
export function DangerZone({ clearLabel, deleteLabel, note, onClear, onDelete }: Props) {
  return (
    <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center">
      <DangerButton onClick={onClear} className=" pb-8">{clearLabel}</DangerButton>
      <DangerButton onClick={onDelete}>{deleteLabel}</DangerButton>
      <p className="text3 text-[10px] text-center mt-8 leading-relaxed font-hias uppercase">
        {note}
      </p>
    </div>
  );
}
