/** Bloc gris pulsant des squelettes de chargement ; `className` règle taille et arrondi. */
export default function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />;
}
