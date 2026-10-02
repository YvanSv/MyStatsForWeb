import { describe, expectTypeOf, it } from "vitest";
import type { MergeEntity, MergeRequestWithDetails } from "./action";
import type { Album, Artist, Track } from "../data/interfaces";

describe("MergeRequestWithDetails – entités chargées pour l'affichage", () => {
  it("MergeEntity est une union Artist | Album | Track", () => {
    expectTypeOf<MergeEntity>().toEqualTypeOf<Artist | Album | Track>();
  });

  it("duplicate_data et target_data sont des MergeEntity facultatives", () => {
    expectTypeOf<MergeRequestWithDetails["duplicate_data"]>().toEqualTypeOf<MergeEntity | undefined>();
    expectTypeOf<MergeRequestWithDetails["target_data"]>().toEqualTypeOf<MergeEntity | undefined>();
  });
});
