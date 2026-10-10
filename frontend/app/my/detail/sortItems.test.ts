import { describe, expect, it } from "vitest";
import type { DetailChild } from "../../hooks/apiTypes";
import { nextSort, sortChildren } from "./sortItems";

const item = (id: number, streams: number, minutes: number, rating: number | null): DetailChild =>
  ({ id, name: `n${id}`, image: null, streams, minutes, rating });
const A = item(1, 10, 300, 1.2), B = item(2, 30, 100, null), C = item(3, 20, 200, 1.9), D = item(4, 20, 50, 1.9);
const ids = (l: DetailChild[]) => l.map((i) => i.id);

describe("sortChildren", () => {
  it("sans critère, renvoie l'ordre d'origine (même tableau)", () => {
    const list = [A, B, C];
    expect(sortChildren(list, null, "desc")).toBe(list);
  });

  it("décroissant : du plus grand au plus petit pour chaque critère", () => {
    const list = [A, B, C, D];
    expect(ids(sortChildren(list, "streams", "desc"))).toEqual([2, 3, 4, 1]);
    expect(ids(sortChildren(list, "minutes", "desc"))).toEqual([1, 3, 2, 4]);
    expect(ids(sortChildren(list, "rating", "desc"))).toEqual([3, 4, 1, 2]);
  });

  it("croissant : sens inverse, égalités dans l'ordre d'origine", () => {
    const list = [A, B, C, D];
    expect(ids(sortChildren(list, "streams", "asc"))).toEqual([1, 3, 4, 2]);
    expect(ids(sortChildren(list, "rating", "asc"))).toEqual([1, 3, 4, 2]);
  });

  it("une note absente passe en dernier dans les deux sens", () => {
    const list = [B, A, C];
    expect(ids(sortChildren(list, "rating", "desc")).at(-1)).toBe(2);
    expect(ids(sortChildren(list, "rating", "asc")).at(-1)).toBe(2);
  });

  it("ne modifie pas la liste d'origine", () => {
    const list = [A, B, C];
    sortChildren(list, "streams", "desc");
    expect(ids(list)).toEqual([1, 2, 3]);
  });
});

describe("nextSort", () => {
  it("premier clic : décroissant ; second : croissant ; troisième : décroissant", () => {
    let s = nextSort({ key: null, direction: "desc" }, "minutes");
    expect(s).toEqual({ key: "minutes", direction: "desc" });
    s = nextSort(s, "minutes");
    expect(s).toEqual({ key: "minutes", direction: "asc" });
    s = nextSort(s, "minutes");
    expect(s).toEqual({ key: "minutes", direction: "desc" });
  });

  it("un autre critère repart en décroissant", () => {
    expect(nextSort({ key: "minutes", direction: "asc" }, "rating")).toEqual({ key: "rating", direction: "desc" });
  });
});
