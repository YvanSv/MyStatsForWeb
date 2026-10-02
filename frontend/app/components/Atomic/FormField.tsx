import type { ReactNode } from "react";

// Attributs à poser sur le champ pour le relier à son libellé et à son message d'erreur
export interface FieldProps {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface Props {
  id: string;
  label: ReactNode;
  labelClassName: string;
  // Compteur affiché à droite du libellé
  counter?: ReactNode;
  // Message d'erreur ("" = aucune erreur). `undefined` : le champ n'a ni aria-invalid ni aria-describedby.
  error?: string;
  errorClassName?: string;
  className?: string;
  children: (field: FieldProps) => ReactNode;
}

export function FormField({ id, label, labelClassName, counter, error, errorClassName, className = "space-y-1", children }: Props) {
  const errorId = `${id}-err`;
  const field: FieldProps = { id };
  if (error !== undefined) {
    field["aria-invalid"] = !!error;
    field["aria-describedby"] = error ? errorId : undefined;
  }
  const labelEl = <label htmlFor={id} className={labelClassName}>{label}</label>;
  return (
    <div className={className}>
      {counter !== undefined ? <div className="flex justify-between">{labelEl}{counter}</div> : labelEl}
      {children(field)}
      {error ? <p id={errorId} role="alert" className={errorClassName}>{error}</p> : null}
    </div>
  );
}
