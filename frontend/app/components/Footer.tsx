import Link from 'next/link';
import { ApiStatusBadge } from './StatusBadge';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto pt-4">
      <div className="max-w-[1800px] mx-auto">
        <div className="bg-bg2 border-t border-white/5 p-6 pt-5 pb-4 grid grid-cols-1 md:grid-cols-3 items-center">
          {/* Section Gauche : Logo / Nom */}
          <div className="flex items-center gap-4 justify-start">
            <div className="w-10 h-10 bg-vert rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(29,208,93,0.2)] shrink-0">
              <span className="text-black font-bold text-2xl">⇅</span>
            </div>
            <div>
              <h4 className="text-white font-hias font-bold text-base leading-none tracking-tight">MyStats</h4>
              <p className="text-gray-500 text-[9px] uppercase tracking-[0.2em] mt-1">Analytics Studio</p>
            </div>
          </div>

          {/* Section Centre : Navigation avec séparateurs */}
          <div className="flex flex-col items-center py-4 md:py-0 my-4 md:my-0">
            <nav className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
              <Link href="/dashboard" className="hover:text-vert transition-colors"> Mon dashboard</Link>
              <Link href="/about" className="hover:text-vert transition-colors">À propos</Link>
            </nav>
            <p className="text-gray-400 text-[9px] font-mono font-medium pt-3 opacity-50 uppercase tracking-tighter">
              &copy; {currentYear} • MyStats • Tous droits réservés
            </p>
          </div>

          {/* Section Droite : Status & Version */}
          <div className="flex items-center justify-end gap-6">
            <div className="hidden sm:block">
              <ApiStatusBadge />
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-gray-400 text-[9px] font-mono uppercase tracking-tight">Designed for Music Lovers</p>
              <p className="text-vert/70 text-[10px] font-mono font-bold italic">v0.11.4</p>
            </div>
          </div>
          
        </div>
      </div>
    </footer>
  );
}