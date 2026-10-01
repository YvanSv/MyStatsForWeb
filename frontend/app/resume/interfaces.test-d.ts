/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expectTypeOf, it } from "vitest";
import type {
  DataFormat, ItemBrief, PlacedWidget, RangeOption, SelectedWidget, SortOption, UserProfile,
} from "./interfaces";

describe("interfaces – types", () => {
  it("SortOption et RangeOption sont des unions littérales", () => {
    expectTypeOf<SortOption>().toEqualTypeOf<"streams" | "minutes" | "rating">();
    expectTypeOf<RangeOption>().toEqualTypeOf<"day" | "month" | "season" | "year" | "lifetime">();
  });

  it("ItemBrief : image optionnelle, le reste obligatoire", () => {
    expectTypeOf<ItemBrief["image"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ItemBrief["name"]>().toBeString();
    expectTypeOf<ItemBrief["rating"]>().toBeNumber();
    expectTypeOf<{ name: string; minutes: number; rating: number; streams: number }>().toExtend<ItemBrief>();
    expectTypeOf<{ name: string }>().not.toExtend<ItemBrief>();
  });

  it("UserProfile expose les champs du profil", () => {
    expectTypeOf<UserProfile>().toHaveProperty("display_name").toBeString();
    expectTypeOf<UserProfile>().toHaveProperty("perms").toEqualTypeOf<any[]>();
  });

  it("DataFormat agrège utilisateur, tops et compteurs", () => {
    expectTypeOf<DataFormat["user"]>().toEqualTypeOf<UserProfile>();
    expectTypeOf<DataFormat["topArtists"]>().toEqualTypeOf<ItemBrief[]>();
    expectTypeOf<DataFormat["distinct_artists"]>().toBeNumber();
  });

  it("PlacedWidget et SelectedWidget partagent id, type et settings", () => {
    expectTypeOf<PlacedWidget["id"]>().toBeNumber();
    expectTypeOf<PlacedWidget>().toHaveProperty("index").toBeNumber();
    expectTypeOf<SelectedWidget>().toHaveProperty("settings");
    expectTypeOf<PlacedWidget>().toExtend<SelectedWidget>();
    expectTypeOf<SelectedWidget>().not.toExtend<PlacedWidget>();
  });
});
