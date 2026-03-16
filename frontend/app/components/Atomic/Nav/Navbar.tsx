import Image from "next/image";

export function HeaderLogo({onClick}:any) {
  const agencement = 'flex items-center w-fit';
  const forme = 'md:gap-3';
  const couleur = 'text1 text-[28px] md:text-[40px] tracking-tighter font-semibold';
  const transformation = 'cursor-pointer transition-all duration-300 hover:text-vert hover:scale-105';

  return (
    <div className={`${agencement} ${couleur} ${transformation} ${forme}`} onClick={onClick}>
      <Image src="/logo.png" alt="Logo" width={60} height={60} priority className="w-8 md:w-13 h-auto" />
      MyStats
    </div>
  );
}

export function NavButton({children,onClick}:any) {
  const agencement = 'w-fit h-fit flex items-center gap-2';
  const forme = '';
  const couleur = 'text1 hover:text-vert';
  const transformation = 'cursor-pointer transition-all duration-300 active:scale-95 ease-out';

  return (
    <button className={`${agencement} ${couleur} ${transformation} ${forme}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function PopoverMenu({children,additional}:any) {
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

export function MenuButton({children,onClick,additional}:any) {
  const agencement = 'flex items-center text-left';
  const forme = 'w-full px-3 py-2.5 rounded-lg gap-4';
  const couleur = 'text-sm hover:text-vert hover:bg-white/[0.05]';
  const transformation = 'transition-colors';

  return (
    <button className={`${agencement} ${couleur} ${transformation} ${forme} ${additional}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function MenuButtonDanger({children,onClick,additional}:any) {
  const agencement = 'flex items-center text-left';
  const forme = 'w-full px-3 py-2.5 rounded-lg gap-4';
  const couleur = 'text-sm text-red-400 hover:bg-red-500/10';
  const transformation = 'transition-colors';

  return (
    <button className={`${agencement} ${couleur} ${transformation} ${forme} ${additional}`} onClick={onClick}>
      {children}
    </button>
  );
}