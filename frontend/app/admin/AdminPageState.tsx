import { ReactNode } from "react";

interface AdminPageStateProps {
  /** « loading » : texte pulsant ; « error » : texte rouge, avec icône éventuelle. */
  variant: "loading" | "error";
  children: ReactNode;
  icon?: ReactNode;
  /** Classes ajoutées (ex. fond de page). */
  className?: string;
}

/** Écran plein centré affiché pendant le chargement ou en cas d'erreur d'une page d'administration. */
export default function AdminPageState({ variant, children, icon, className }: AdminPageStateProps) {
  const tone = variant === "loading" ? "text3 animate-pulse" : "text-red-400";
  return (
    <div className={`min-h-screen flex items-center justify-center ${tone}${className ? ` ${className}` : ""}`}>
      {icon}{children}
    </div>
  );
}
