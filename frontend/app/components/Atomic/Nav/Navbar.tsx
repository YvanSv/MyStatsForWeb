import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/app/context/languageContext";
import { APP_NAME } from "@/app/constants/app";

// href : le composant devient un vrai lien (prefetch, clic droit, nouvel onglet) avec le même style
interface ClickableProps { children?: ReactNode; onClick?: () => void; href?: string }
interface StyledProps { children?: ReactNode; additional?: string }

export function HeaderLogo({onClick}:{onClick?: () => void}) {
  const { t } = useLanguage();
  const agencement = 'flex items-center w-fit';
  const forme = 'gap-2 lg:gap-3';
  const couleur = 'text1 text-[28px] md:text-[32px] lg:text-[40px] tracking-tighter font-semibold';
  const transformation = 'cursor-pointer transition-all duration-300 hover:text-vert hover:scale-105';

  return (
    <div className={`${agencement} ${couleur} ${transformation} ${forme}`} onClick={onClick}>
      <Image src="/logo.png" alt={t.a11y.logo} width={60} height={60} priority className="w-8 md:w-11 lg:w-13 h-auto" />
      {APP_NAME}
    </div>
  );
}

export function NavButton({children,onClick,href}:ClickableProps) {
  const agencement = 'w-fit h-fit flex items-center gap-1 lg:gap-2';
  const forme = 'text-md xl:text-2xl';
  const couleur = 'text1 hover:text-vert';
  const transformation = 'cursor-pointer transition-all duration-300 active:scale-95 ease-out';

  const className = `${agencement} ${couleur} ${transformation} ${forme}`;
  if (href !== undefined) return <Link href={href} className={className} onClick={onClick}>{children}</Link>;
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}

export function PopoverMenu({children,additional=''}:StyledProps) {
  const agencement = 'absolute top-full left-1/2 -translate-x-1/2 z-50 overflow-hidden whitespace-nowrap';
  const forme = 'rounded-xl mt-1 p-1';
  const couleur = 'bg-bg2 border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible';
  const transformation = 'transition-all duration-200';

  return (
    <div className={`${agencement} ${couleur} ${transformation} ${forme} ${additional}`}>
      {children}
    </div>
  );
}

export function MenuButton({children,onClick,additional='',label,href}:ClickableProps & StyledProps & { label?: string }) {
  const agencement = 'flex items-center text-left';
  const forme = 'w-full px-3 py-2.5 rounded-lg gap-4';
  const couleur = 'text-sm hover:text-vert hover:bg-white/[0.05]';
  const transformation = 'transition-colors';

  const className = `${agencement} ${couleur} ${transformation} ${forme} ${additional}`;
  if (href !== undefined) return <Link href={href} className={className} onClick={onClick} aria-label={label}>{children}</Link>;
  return (
    <button className={className} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}

export function MenuButtonDanger({children,onClick,additional='',label}:ClickableProps & StyledProps & { label?: string }) {
  const agencement = 'flex items-center text-left';
  const forme = 'w-full px-3 py-2.5 rounded-lg gap-4';
  const couleur = 'text-sm text-red-400 hover:bg-red-500/10';
  const transformation = 'transition-colors';

  return (
    <button className={`${agencement} ${couleur} ${transformation} ${forme} ${additional}`} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}