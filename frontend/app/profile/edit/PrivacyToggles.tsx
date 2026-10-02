import { ALL_PERMS, type PermKey } from "@/app/constants/validation";
import { OptionToggle } from "./OptionToggle";

interface Props {
  perms: typeof ALL_PERMS;
  onChange: (key: PermKey, value: boolean) => void;
  // Textes du dictionnaire profileEdit
  dict: Record<string, string>;
}

const TOGGLES: { key: PermKey; title: string; desc: string }[] = [
  { key: "profile", title: "toggleProfile", desc: "descProfile" },
  { key: "stats", title: "toggleStats", desc: "descStats" },
  { key: "favorites", title: "toggleFavs", desc: "descFavs" },
  { key: "history", title: "toggleHistory", desc: "descHistory" },
  { key: "dashboard", title: "toggleDash", desc: "descDash" },
];

// Réglages de confidentialité : tout dépend de la visibilité du profil
export function PrivacyToggles({ perms, onChange, dict }: Props) {
  return (
    <div className="flex flex-col gap-8 p-4 border border-white/5 bg-white/5 rounded-2xl w-full">
      {TOGGLES.map(({ key, title, desc }) => (
        <OptionToggle key={key} title={dict[title]} description={dict[desc]}
          active={perms[key]} onChange={(v: boolean) => onChange(key, v)}
          disabled={key === "profile" ? undefined : !perms.profile}
        />
      ))}
    </div>
  );
}
