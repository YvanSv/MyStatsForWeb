import type { DetailChild } from "../../hooks/apiTypes";

export type ChildSortKey = "streams" | "minutes" | "rating";
export type SortDirection = "desc" | "asc";

/**
 * Trie une copie de la liste sur le critère demandé (décroissant : du plus grand au plus petit).
 * Une valeur absente ou invalide passe toujours en dernier, quel que soit le sens ; les égalités gardent
 * l'ordre d'origine (tri stable), donc deux clics successifs ne mélangent pas les éléments à égalité.
 */
export function sortChildren(items: DetailChild[], key: ChildSortKey | null, direction: SortDirection): DetailChild[] {
  if (!key) return items;
  const valid = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
  const indexed = items.map((item, index) => ({ item, index, value: item[key] as number | null | undefined }));
  indexed.sort((a, b) => {
    const av = valid(a.value), bv = valid(b.value);
    if (!av && !bv) return a.index - b.index;
    if (!av) return 1;
    if (!bv) return -1;
    const diff = direction === "desc" ? (b.value as number) - (a.value as number) : (a.value as number) - (b.value as number);
    return diff || a.index - b.index;
  });
  return indexed.map((e) => e.item);
}

/** État suivant après un clic sur la colonne `key` : première fois décroissant, puis le sens s'inverse ; une autre colonne repart en décroissant. */
export function nextSort(current: { key: ChildSortKey | null; direction: SortDirection }, key: ChildSortKey): { key: ChildSortKey; direction: SortDirection } {
  if (current.key === key) return { key, direction: current.direction === "desc" ? "asc" : "desc" };
  return { key, direction: "desc" };
}
