import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  showLabel: string;
  hideLabel: string;
  buttonClassName?: string;
}

const BUTTON_BASE = "absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors";

// Champ mot de passe avec bouton œil (afficher / masquer)
export function PasswordInput({ showLabel, hideLabel, buttonClassName = "", ...input }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...input} type={visible ? "text" : "password"} />
      <button type="button" onClick={() => setVisible(v => !v)}
        aria-label={visible ? hideLabel : showLabel} aria-pressed={visible}
        className={`${BUTTON_BASE} ${buttonClassName}`.trim()}
      >{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
    </div>
  );
}
