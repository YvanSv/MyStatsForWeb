import { describe, expect, it } from "vitest";
import { splitTrackTitle } from "./splitTrackTitle";

describe("splitTrackTitle", () => {
  it.each([[undefined], [null], [""]])("tout indéfini pour %s", (v) => expect(splitTrackTitle(v)).toEqual({ artist: undefined, title: undefined }));
  it("sans séparateur, tout est l'artiste", () => expect(splitTrackTitle("Daft Punk")).toEqual({ artist: "Daft Punk", title: undefined }));
  it("coupe au premier « - » seulement", () => expect(splitTrackTitle("A - B - C")).toEqual({ artist: "A", title: "B - C" }));
  it("ne coupe pas un tiret sans espaces", () => expect(splitTrackTitle("Jay-Z")).toEqual({ artist: "Jay-Z", title: undefined }));
});
