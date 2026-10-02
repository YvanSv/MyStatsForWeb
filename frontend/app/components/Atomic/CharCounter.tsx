interface Thresholds {
  max: number;
  warn: number;
  danger: number;
  min?: number;
}

// Rouge sous le minimum, jaune au-delà de `warn`, orange au-delà de `danger`, rouge à la limite, sinon couleur neutre
export function counterColorClass(length: number, { max, warn, danger, min }: Thresholds): string {
  if (min !== undefined && length < min) return "text-rouge";
  if (length <= warn) return "text2";
  if (length <= danger) return "text-jaune";
  return length >= max ? "text-rouge" : "text-orange";
}

interface Props extends Thresholds {
  value: string | undefined;
  className?: string;
}

export function CharCounter({ value, max, min, warn, danger, className = "" }: Props) {
  const length = value?.length ?? 0;
  return <p className={`${className} ${counterColorClass(length, { max, min, warn, danger })}`}>{length}/{max}</p>;
}
