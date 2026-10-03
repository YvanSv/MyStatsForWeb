import Link from "next/link";
import { useLanguage } from "@/app/context/languageContext";
import type { DataInfo } from "@/app/data/DataInfos";
import { itemDetailPath } from "@/app/services/url";

/** Classes du lien étiré : son pseudo-élément couvre toute la cellule (le conteneur doit être `relative`). */
const STRETCHED = "after:absolute after:inset-0 after:z-20 after:content-[''] outline-none focus-visible:after:ring-2 focus-visible:after:ring-vert focus-visible:after:rounded-[inherit]";

interface CellNameProps {
  element: DataInfo;
  name: string;
  /** Active le lien vers la page de détail (réservé aux classements « /my » : la page n'affiche que les données de l'utilisateur connecté). */
  linkTo?: boolean;
}

/**
 * Nom d'une cellule de classement. Avec `linkTo` et un id, c'est un lien vers la page de détail de l'élément :
 * le lien est dans le titre (nom accessible = nom de l'élément, pas de lien imbriqué) mais couvre toute la cellule.
 */
export default function CellName({ element, name, linkTo = false }: CellNameProps) {
  const { t } = useLanguage();
  if (!linkTo || element.id === undefined || element.id === null) return <>{name}</>;
  return (
    <Link href={itemDetailPath(element.type, element.id)} aria-label={t.rankingcell.openDetail(name)} className={STRETCHED}>
      {name}
    </Link>
  );
}
