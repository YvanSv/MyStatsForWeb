import { describe, expectTypeOf, it } from "vitest";
import type { CumulativePoint, DashboardStats, DiscoveryPoint, HourlyData, MonthPoint, TopItem, WeekdayPoint, YearPoint } from "./utils";
import { INITIAL_STATS } from "./utils";

describe("DashboardStats – points de données renvoyés par le backend", () => {
  it("les graphiques d'activité portent value (minutes) et streams, avec leur clé de regroupement", () => {
    expectTypeOf<DashboardStats["clockData"]>().toEqualTypeOf<HourlyData[]>();
    expectTypeOf<DashboardStats["weeklyData"]>().toEqualTypeOf<WeekdayPoint[]>();
    expectTypeOf<DashboardStats["monthlyData"]>().toEqualTypeOf<MonthPoint[]>();
    expectTypeOf<DashboardStats["annualData"]>().toEqualTypeOf<YearPoint[]>();
    expectTypeOf<WeekdayPoint["day"]>().toBeString();
    expectTypeOf<MonthPoint["month"]>().toBeString();
    expectTypeOf<YearPoint["year"]>().toBeString();
    expectTypeOf<HourlyData["value"]>().toBeNumber();
    expectTypeOf<HourlyData["streams"]>().toBeNumber();
  });

  it("les courbes portent une date et des cumuls numériques", () => {
    expectTypeOf<DashboardStats["cumulativeData"]>().toEqualTypeOf<CumulativePoint[]>();
    expectTypeOf<DashboardStats["streamsEvolution"]>().toEqualTypeOf<CumulativePoint[]>();
    expectTypeOf<DashboardStats["entityEvolution"]>().toEqualTypeOf<DiscoveryPoint[]>();
    expectTypeOf<CumulativePoint["date"]>().toBeString();
    expectTypeOf<DiscoveryPoint["tracks"]>().toBeNumber();
    expectTypeOf<DiscoveryPoint["albums"]>().toBeNumber();
    expectTypeOf<DiscoveryPoint["artists"]>().toBeNumber();
  });

  it("les pics sont des libellés (minutes puis streams)", () => {
    expectTypeOf<DashboardStats["peakHour"]>().toEqualTypeOf<string[]>();
    expectTypeOf<DashboardStats["peakDay"]>().toEqualTypeOf<string[]>();
    expectTypeOf<DashboardStats["peakMonth"]>().toEqualTypeOf<string[]>();
  });

  it("les meilleurs éléments sont des couples TopItem ou null", () => {
    expectTypeOf<DashboardStats["topTrack"]>().toEqualTypeOf<TopItem[] | null>();
    expectTypeOf<TopItem["image"]>().toEqualTypeOf<string | null>();
  });

  it("INITIAL_STATS respecte DashboardStats", () => {
    expectTypeOf(INITIAL_STATS).toEqualTypeOf<DashboardStats>();
  });

  it("refuse un point de courbe sans cumul", () => {
    expectTypeOf<{ date: string }>().not.toMatchTypeOf<CumulativePoint>();
  });
});
