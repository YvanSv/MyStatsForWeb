import type { PermKey } from "../constants/validation";
import { describe, expectTypeOf, it } from "vitest";
import type {
  AnyWidgetSettings, BackgroundWidgetSettings, BioWidgetSettings, DataFormat, ItemBrief, ProfilePictureWidgetSettings,
  ResumeData, StatWidgetSettings, TextAlign, UsernameWidgetSettings, VerticalAlign, WidgetSettingsMap, WidgetType, PlacedWidget, RangeOption, SelectedWidget, SortOption, UserProfile,
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
    expectTypeOf<UserProfile>().toHaveProperty("perms").toEqualTypeOf<Record<PermKey, boolean>>();
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

describe("réglages par widget", () => {
  it("WidgetType est la clé de WidgetSettingsMap (les 9 types du canvas)", () => {
    expectTypeOf<WidgetType>().toEqualTypeOf<
      "profile_picture" | "username" | "background" | "bio" | "minutes" | "streams" | "nb_tracks" | "nb_albums" | "nb_artists"
    >();
  });

  it("chaque type de widget a ses réglages", () => {
    expectTypeOf<WidgetSettingsMap["username"]>().toEqualTypeOf<UsernameWidgetSettings>();
    expectTypeOf<WidgetSettingsMap["bio"]>().toEqualTypeOf<BioWidgetSettings>();
    expectTypeOf<WidgetSettingsMap["background"]>().toEqualTypeOf<BackgroundWidgetSettings>();
    expectTypeOf<WidgetSettingsMap["profile_picture"]>().toEqualTypeOf<ProfilePictureWidgetSettings>();
    expectTypeOf<WidgetSettingsMap["streams"]>().toEqualTypeOf<StatWidgetSettings>();
    expectTypeOf<WidgetSettingsMap["nb_artists"]>().toEqualTypeOf<StatWidgetSettings>();
    expectTypeOf<AnyWidgetSettings>().toEqualTypeOf<WidgetSettingsMap[WidgetType]>();
  });

  it("alignements : unions littérales", () => {
    expectTypeOf<TextAlign>().toEqualTypeOf<"left" | "center" | "right">();
    expectTypeOf<VerticalAlign>().toEqualTypeOf<"top" | "center" | "bottom">();
    expectTypeOf<UsernameWidgetSettings["textAlign"]>().toEqualTypeOf<TextAlign | undefined>();
  });

  it("les réglages sont tous optionnels et typés", () => {
    expectTypeOf<Record<string, never>>().toExtend<UsernameWidgetSettings>();
    expectTypeOf<{ blur: number; opacity: number; gradient: boolean }>().toExtend<BackgroundWidgetSettings>();
    expectTypeOf<{ zoom: string }>().not.toExtend<ProfilePictureWidgetSettings>();
    expectTypeOf<{ textAlign: "justify" }>().not.toExtend<BioWidgetSettings>();
    expectTypeOf<StatWidgetSettings["shorten"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("PlacedWidget est une union discriminée par type", () => {
    expectTypeOf<{ id: 1; type: "bio"; index: 0; w: 1; h: 1; settings: { fontSize: string } }>().toExtend<PlacedWidget>();
    expectTypeOf<{ id: 1; type: "bio"; index: 0; w: 1; h: 1; settings: { zoom: number } }>().not.toExtend<PlacedWidget>();
    expectTypeOf<{ id: 1; type: "inconnu"; index: 0; w: 1; h: 1; settings: Record<string, never> }>().not.toExtend<PlacedWidget>();
    expectTypeOf<Extract<PlacedWidget, { type: "background" }>["settings"]>().toEqualTypeOf<BackgroundWidgetSettings>();
    expectTypeOf<Extract<SelectedWidget, { type: "username" }>["settings"]>().toEqualTypeOf<UsernameWidgetSettings>();
  });

  it("ResumeData est le sous-ensemble de DataFormat lu par le canvas", () => {
    expectTypeOf<DataFormat>().toExtend<ResumeData>();
    expectTypeOf<ResumeData>().not.toHaveProperty("topArtists");
    expectTypeOf<ResumeData["user"]>().toEqualTypeOf<UserProfile>();
  });
});
