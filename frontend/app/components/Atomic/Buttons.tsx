interface Props {
  children: any;
  additional?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "submit" | "reset" | "button" | undefined;
}

const agencement_base = 'flex items-center justify-center';
const forme_base = 'rounded-full';
const transformation_base = 'transition-all duration-300 ease-out active:scale-95 cursor-pointer';

export function PrimaryButton({children,additional,onClick,disabled,type}:Props) {
  const agencement = agencement_base;
  const forme = forme_base;
  const couleur = 'bg-vert hover:bg-vert/90 text4 hover:shadow-[0_0_30px_rgba(30,215,96,0.3)] font-semibold';
  const transformation = transformation_base;

  return (
    <button className={`${agencement} ${couleur} ${transformation} ${forme} ${additional}`} onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  );
}

export function SecondaryButton({children,additional,onClick,disabled}:Props) {
  const agencement = agencement_base;
  const forme = forme_base;
  const couleur = `border font-semibold ${disabled ? 'border-gray-500/10 text3' :
    'border-white/10 hover:border-white/20 hover:bg-white/5 text1'}`;
  const transformation = !disabled && transformation_base;

  return (
    <button className={`${agencement} ${couleur} ${transformation} ${forme} ${additional}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function TertiaryButton({children,additional,onClick}:Props) {
  const agencement = '';
  const forme = 'rounded-2xl';
  const couleur = 'border border-white/10 bg-white/5';
  const transformation = transformation_base;

  return (
    <button className={`${agencement} ${additional} ${couleur} ${transformation} ${forme}`} onClick={onClick}>
      {children}
    </button>
  );
}