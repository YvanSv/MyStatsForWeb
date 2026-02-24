import { JSX } from "react";

interface GreenButtonProps {
    icon?: () => JSX.Element;
    texte?: string;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

export default function GreenButton({icon, texte, onClick, className, disabled}: GreenButtonProps) {
    return (
        <button onClick={onClick} disabled={disabled} className={`bg-vert px-2 py-2 rounded-full text-xs md:sm font-bold text-black transition-all active:scale-95 hover:scale-105 transition-transform cursor-pointer ${className}`}>
            {icon ? icon() : <></>}{texte}
        </button>
    );
}