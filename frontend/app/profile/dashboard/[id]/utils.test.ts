import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatToInputDate, getDateRange, getRangeLabel, INITIAL_STATS, smoothHourlyData } from "./utils";

// Toutes les dates sont construites en heure locale : les tests restent valides quel que soit TZ.
const local = (y: number, m: number, d: number, h = 0, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, mi, s, ms);
const iso = (d: Date) => d.toISOString();
const startOf = (y: number, m: number, d: number) => iso(local(y, m, d));
const endOf = (y: number, m: number, d: number) => iso(local(y, m, d, 23, 59, 59, 999));

const setNow = (y: number, m: number, d: number, h = 12, mi = 0, s = 0, ms = 0) =>
  vi.setSystemTime(local(y, m, d, h, mi, s, ms));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Jeudi 1er octobre 2026, 12:00 (heure locale)
  setNow(2026, 10, 1);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("INITIAL_STATS", () => {
  it("expose des compteurs à zéro et un ratio à 0%", () => {
    expect(INITIAL_STATS).toMatchObject({
      totalTime: 0,
      avgTimePerDay: 0,
      totalStreams: 0,
      avgStreamsPerDay: 0,
      uniqueTracks: 0,
      uniqueAlbums: 0,
      uniqueArtists: 0,
      ratio: "0%",
    });
  });

  it("expose des tableaux vides pour tous les graphiques", () => {
    for (const key of [
      "peakHour", "peakDay", "peakMonth", "clockData", "weeklyData", "monthlyData",
      "annualData", "cumulativeData", "entityEvolution", "streamsEvolution",
    ] as const) {
      expect(INITIAL_STATS[key]).toEqual([]);
    }
  });

  it("n'a aucun top média par défaut (null)", () => {
    expect(INITIAL_STATS.topTrack).toBeNull();
    expect(INITIAL_STATS.topAlbum).toBeNull();
    expect(INITIAL_STATS.topArtist).toBeNull();
  });
});

describe("formatToInputDate", () => {
  it("renvoie une chaîne vide pour null", () => {
    expect(formatToInputDate(null)).toBe("");
  });

  it("renvoie une chaîne vide pour une chaîne vide", () => {
    expect(formatToInputDate("")).toBe("");
  });

  it("formate au format yyyy-MM-dd en heure locale", () => {
    expect(formatToInputDate(iso(local(2026, 3, 15, 10, 30)))).toBe("2026-03-15");
  });

  it("complète le mois et le jour sur deux chiffres", () => {
    expect(formatToInputDate(iso(local(2026, 1, 5)))).toBe("2026-01-05");
    expect(formatToInputDate(iso(local(2026, 9, 9)))).toBe("2026-09-09");
  });

  it("garde le mois à deux chiffres pour octobre, novembre et décembre", () => {
    expect(formatToInputDate(iso(local(2026, 10, 31)))).toBe("2026-10-31");
    expect(formatToInputDate(iso(local(2026, 12, 1)))).toBe("2026-12-01");
  });

  it("conserve le jour local à la dernière milliseconde de la journée", () => {
    expect(formatToInputDate(iso(local(2026, 6, 30, 23, 59, 59, 999)))).toBe("2026-06-30");
  });

  it("conserve le jour local à minuit pile", () => {
    expect(formatToInputDate(iso(local(2026, 7, 1, 0, 0, 0, 0)))).toBe("2026-07-01");
  });

  it("gère le 29 février d'une année bissextile", () => {
    expect(formatToInputDate(iso(local(2028, 2, 29, 12)))).toBe("2028-02-29");
  });

  it("gère le passage d'année (31 décembre / 1er janvier)", () => {
    expect(formatToInputDate(iso(local(2025, 12, 31, 23, 59)))).toBe("2025-12-31");
    expect(formatToInputDate(iso(local(2026, 1, 1, 0, 1)))).toBe("2026-01-01");
  });

  it("renvoie une chaîne vide pour une date invalide plutôt que NaN-NaN-NaN", () => {
    expect(formatToInputDate("pas-une-date")).toBe("");
  });
});

describe("getDateRange", () => {
  describe("lifetime", () => {
    it("renvoie des bornes nulles", () => {
      expect(getDateRange("lifetime")).toEqual({ start: null, end: null });
    });

    it("ignore l'offset", () => {
      expect(getDateRange("lifetime", 5)).toEqual({ start: null, end: null });
    });
  });

  describe("today", () => {
    it("couvre la journée courante de minuit à 23:59:59.999", () => {
      expect(getDateRange("today")).toEqual({ start: startOf(2026, 10, 1), end: endOf(2026, 10, 1) });
    });

    it("recule d'un jour avec offset -1 en franchissant la fin de mois", () => {
      expect(getDateRange("today", -1)).toEqual({ start: startOf(2026, 9, 30), end: endOf(2026, 9, 30) });
    });

    it("avance d'un jour avec offset +1", () => {
      expect(getDateRange("today", 1)).toEqual({ start: startOf(2026, 10, 2), end: endOf(2026, 10, 2) });
    });

    it("franchit le changement d'année", () => {
      setNow(2026, 1, 1);
      expect(getDateRange("today", -1)).toEqual({ start: startOf(2025, 12, 31), end: endOf(2025, 12, 31) });
    });

    it("fonctionne à 23:59:59.999 (dernière milliseconde du jour)", () => {
      setNow(2026, 10, 1, 23, 59, 59, 999);
      expect(getDateRange("today")).toEqual({ start: startOf(2026, 10, 1), end: endOf(2026, 10, 1) });
    });

    it("fonctionne à minuit pile", () => {
      setNow(2026, 10, 1, 0, 0, 0, 0);
      expect(getDateRange("today")).toEqual({ start: startOf(2026, 10, 1), end: endOf(2026, 10, 1) });
    });

    it("gère le 29 février d'une année bissextile", () => {
      setNow(2028, 3, 1);
      expect(getDateRange("today", -1)).toEqual({ start: startOf(2028, 2, 29), end: endOf(2028, 2, 29) });
    });
  });

  describe("week (du lundi au dimanche)", () => {
    it("renvoie la semaine du lundi au dimanche en milieu de mois", () => {
      setNow(2026, 10, 14); // mercredi
      expect(getDateRange("week")).toEqual({ start: startOf(2026, 10, 12), end: endOf(2026, 10, 18) });
    });

    it("démarre le lundi même quand on est lundi", () => {
      setNow(2026, 10, 12); // lundi
      expect(getDateRange("week")).toEqual({ start: startOf(2026, 10, 12), end: endOf(2026, 10, 18) });
    });

    it("le dimanche appartient à la semaine qui s'achève ce jour-là", () => {
      setNow(2026, 10, 11); // dimanche
      expect(getDateRange("week")).toEqual({ start: startOf(2026, 10, 5), end: endOf(2026, 10, 11) });
    });

    it("se termine le dimanche suivant quand on est samedi", () => {
      setNow(2026, 10, 17); // samedi
      expect(getDateRange("week")).toEqual({ start: startOf(2026, 10, 12), end: endOf(2026, 10, 18) });
    });

    it("recule d'une semaine avec offset -1", () => {
      setNow(2026, 10, 14);
      expect(getDateRange("week", -1)).toEqual({ start: startOf(2026, 10, 5), end: endOf(2026, 10, 11) });
    });

    it("avance d'une semaine avec offset +1", () => {
      setNow(2026, 10, 14);
      expect(getDateRange("week", 1)).toEqual({ start: startOf(2026, 10, 19), end: endOf(2026, 10, 25) });
    });

    it("une semaine à cheval sur deux mois se termine bien le dimanche suivant (jeudi 1er octobre)", () => {
      // lundi 28 septembre -> dimanche 4 octobre
      expect(getDateRange("week")).toEqual({ start: startOf(2026, 9, 28), end: endOf(2026, 10, 4) });
    });

    it("une semaine à cheval sur deux années se termine bien le dimanche suivant (jeudi 1er janvier)", () => {
      setNow(2026, 1, 1); // lundi 29 décembre 2025 -> dimanche 4 janvier 2026
      expect(getDateRange("week")).toEqual({ start: startOf(2025, 12, 29), end: endOf(2026, 1, 4) });
    });

    it("une semaine reculée à cheval sur deux mois garde une fin cohérente", () => {
      setNow(2026, 10, 14);
      // offset -2 : lundi 28 septembre -> dimanche 4 octobre
      expect(getDateRange("week", -2)).toEqual({ start: startOf(2026, 9, 28), end: endOf(2026, 10, 4) });
    });

    it("la fin est toujours exactement 7 jours calendaires après le début (pas de dérive)", () => {
      const { start, end } = getDateRange("week");
      const days = (new Date(end!).getTime() - new Date(start!).getTime()) / 86_400_000;
      expect(Math.round(days)).toBe(7);
    });
  });

  describe("month (mois calendaire)", () => {
    it("renvoie le mois courant du 1er au dernier jour", () => {
      expect(getDateRange("month")).toEqual({ start: startOf(2026, 10, 1), end: endOf(2026, 10, 31) });
    });

    it("recule d'un mois (septembre : 30 jours)", () => {
      expect(getDateRange("month", -1)).toEqual({ start: startOf(2026, 9, 1), end: endOf(2026, 9, 30) });
    });

    it("franchit le changement d'année avec un offset positif", () => {
      expect(getDateRange("month", 3)).toEqual({ start: startOf(2027, 1, 1), end: endOf(2027, 1, 31) });
    });

    it("franchit le changement d'année avec un offset négatif", () => {
      expect(getDateRange("month", -10)).toEqual({ start: startOf(2025, 12, 1), end: endOf(2025, 12, 31) });
    });

    it("depuis un 31 du mois, ne déborde pas sur un mois plus court (31 janvier + 1)", () => {
      setNow(2026, 1, 31);
      expect(getDateRange("month", 1)).toEqual({ start: startOf(2026, 2, 1), end: endOf(2026, 2, 28) });
    });

    it("février d'une année bissextile finit le 29", () => {
      setNow(2028, 1, 31);
      expect(getDateRange("month", 1)).toEqual({ start: startOf(2028, 2, 1), end: endOf(2028, 2, 29) });
    });

    it("février d'une année non bissextile finit le 28", () => {
      setNow(2027, 2, 10);
      expect(getDateRange("month")).toEqual({ start: startOf(2027, 2, 1), end: endOf(2027, 2, 28) });
    });

    it("le 31 d'un mois à 31 jours donne bien le mois entier", () => {
      setNow(2026, 3, 31);
      expect(getDateRange("month")).toEqual({ start: startOf(2026, 3, 1), end: endOf(2026, 3, 31) });
    });

    it("le 1er du mois à minuit pile reste dans le mois courant", () => {
      setNow(2026, 11, 1, 0, 0, 0, 0);
      expect(getDateRange("month")).toEqual({ start: startOf(2026, 11, 1), end: endOf(2026, 11, 30) });
    });
  });

  describe("1m (30 jours glissants alignés sur les jours)", () => {
    it("va d'aujourd'hui - 29 jours à 00:00:00.000 jusqu'à aujourd'hui 23:59:59.999", () => {
      expect(getDateRange("1m")).toEqual({ start: startOf(2026, 9, 2), end: endOf(2026, 10, 1) });
    });

    it("décale de 30 jours par offset", () => {
      expect(getDateRange("1m", -1)).toEqual({ start: startOf(2026, 8, 3), end: endOf(2026, 9, 1) });
      expect(getDateRange("1m", 1)).toEqual({ start: startOf(2026, 10, 2), end: endOf(2026, 10, 31) });
    });

    it("couvre exactement 30 journées locales", () => {
      const { start, end } = getDateRange("1m");
      const days = (new Date(end!).getTime() - new Date(start!).getTime() + 1) / 86_400_000;
      expect(Math.round(days)).toBe(30);
    });

    it("deux offsets consécutifs sont contigus (sans trou ni chevauchement)", () => {
      const a = getDateRange("1m", -1);
      const b = getDateRange("1m", 0);
      expect(new Date(b.start!).getTime() - new Date(a.end!).getTime()).toBe(1);
    });

    it("ne dépend pas de l'heure courante (23:59 et 00:00 donnent la même période)", () => {
      setNow(2026, 10, 1, 0, 0, 0, 0);
      const midnight = getDateRange("1m");
      setNow(2026, 10, 1, 23, 59, 59, 999);
      expect(getDateRange("1m")).toEqual(midnight);
    });
  });

  describe("6m (6 mois calendaires)", () => {
    it("va du 1er du mois courant - 5 à 00:00 au dernier jour du mois courant 23:59:59.999", () => {
      expect(getDateRange("6m")).toEqual({ start: startOf(2026, 5, 1), end: endOf(2026, 10, 31) });
    });

    it("décale de 6 mois par offset", () => {
      expect(getDateRange("6m", -1)).toEqual({ start: startOf(2025, 11, 1), end: endOf(2026, 4, 30) });
      expect(getDateRange("6m", 1)).toEqual({ start: startOf(2026, 11, 1), end: endOf(2027, 4, 30) });
    });

    it("depuis un 31 du mois, ne déborde pas sur un mois plus court (31 août)", () => {
      setNow(2026, 8, 31);
      expect(getDateRange("6m")).toEqual({ start: startOf(2026, 3, 1), end: endOf(2026, 8, 31) });
      expect(getDateRange("6m", -1)).toEqual({ start: startOf(2025, 9, 1), end: endOf(2026, 2, 28) });
    });

    it("février bissextile comme dernier mois", () => {
      setNow(2028, 2, 10);
      expect(getDateRange("6m")).toEqual({ start: startOf(2027, 9, 1), end: endOf(2028, 2, 29) });
    });

    it("deux offsets consécutifs sont contigus", () => {
      const a = getDateRange("6m", -1);
      const b = getDateRange("6m", 0);
      expect(new Date(b.start!).getTime() - new Date(a.end!).getTime()).toBe(1);
    });
  });

  describe("season (saisons météorologiques)", () => {
    it("octobre : automne (1er septembre au 30 novembre)", () => {
      expect(getDateRange("season")).toEqual({ start: startOf(2026, 9, 1), end: endOf(2026, 11, 30) });
    });

    it("avril : printemps (1er mars au 31 mai)", () => {
      setNow(2026, 4, 10);
      expect(getDateRange("season")).toEqual({ start: startOf(2026, 3, 1), end: endOf(2026, 5, 31) });
    });

    it("juillet : été (1er juin au 31 août)", () => {
      setNow(2026, 7, 10);
      expect(getDateRange("season")).toEqual({ start: startOf(2026, 6, 1), end: endOf(2026, 8, 31) });
    });

    it("décembre : hiver (1er décembre au 28 février suivant)", () => {
      setNow(2026, 12, 15);
      expect(getDateRange("season")).toEqual({ start: startOf(2026, 12, 1), end: endOf(2027, 2, 28) });
    });

    it.each([
      [3, 3], [4, 3], [5, 3], // mars, avril, mai
      [6, 6], [7, 6], [8, 6], // juin, juillet, août
      [9, 9], [10, 9], [11, 9], // septembre, octobre, novembre
    ])("le mois %i appartient à la saison démarrant au mois %i", (month, startMonth) => {
      setNow(2026, month, 15);
      expect(getDateRange("season").start).toBe(startOf(2026, startMonth, 1));
    });

    it("1er mars à minuit pile : bascule dans le printemps", () => {
      setNow(2026, 3, 1, 0, 0, 0, 0);
      expect(getDateRange("season").start).toBe(startOf(2026, 3, 1));
    });

    it("28 février 23:59:59.999 : encore l'hiver", () => {
      setNow(2026, 2, 28, 23, 59, 59, 999);
      expect(getDateRange("season").end).toBe(endOf(2026, 2, 28));
    });

    it("31 août : encore l'été, 1er septembre : automne", () => {
      setNow(2026, 8, 31);
      expect(getDateRange("season").start).toBe(startOf(2026, 6, 1));
      setNow(2026, 9, 1);
      expect(getDateRange("season").start).toBe(startOf(2026, 9, 1));
    });

    it("offset -1 : saison précédente (été)", () => {
      expect(getDateRange("season", -1)).toEqual({ start: startOf(2026, 6, 1), end: endOf(2026, 8, 31) });
    });

    it("offset +1 depuis l'automne : hiver qui chevauche deux années", () => {
      expect(getDateRange("season", 1)).toEqual({ start: startOf(2026, 12, 1), end: endOf(2027, 2, 28) });
    });

    it("offset +2 depuis l'automne : printemps de l'année suivante", () => {
      expect(getDateRange("season", 2)).toEqual({ start: startOf(2027, 3, 1), end: endOf(2027, 5, 31) });
    });

    it("offset -4 : même saison un an plus tôt", () => {
      expect(getDateRange("season", -4)).toEqual({ start: startOf(2025, 9, 1), end: endOf(2025, 11, 30) });
    });

    it("l'hiver d'une année bissextile finit le 29 février", () => {
      setNow(2027, 12, 15);
      expect(getDateRange("season").end).toBe(endOf(2028, 2, 29));
    });

    it("depuis un 31 du mois, ne déborde pas (31 mai : printemps)", () => {
      setNow(2026, 5, 31);
      expect(getDateRange("season")).toEqual({ start: startOf(2026, 3, 1), end: endOf(2026, 5, 31) });
    });

    it("en janvier, l'hiver courant a commencé en décembre de l'année précédente", () => {
      setNow(2026, 1, 15);
      expect(getDateRange("season")).toEqual({ start: startOf(2025, 12, 1), end: endOf(2026, 2, 28) });
    });

    it("en février, l'hiver courant a commencé en décembre de l'année précédente", () => {
      setNow(2026, 2, 10);
      expect(getDateRange("season")).toEqual({ start: startOf(2025, 12, 1), end: endOf(2026, 2, 28) });
    });

    it("en janvier, la saison courante contient aujourd'hui", () => {
      setNow(2026, 1, 15);
      const { start, end } = getDateRange("season");
      const now = Date.now();
      expect(new Date(start!).getTime()).toBeLessThanOrEqual(now);
      expect(new Date(end!).getTime()).toBeGreaterThanOrEqual(now);
    });
  });

  describe("year", () => {
    it("renvoie l'année civile courante", () => {
      expect(getDateRange("year")).toEqual({ start: startOf(2026, 1, 1), end: endOf(2026, 12, 31) });
    });

    it("recule d'un an avec offset -1", () => {
      expect(getDateRange("year", -1)).toEqual({ start: startOf(2025, 1, 1), end: endOf(2025, 12, 31) });
    });

    it("avance d'un an avec offset +1", () => {
      expect(getDateRange("year", 1)).toEqual({ start: startOf(2027, 1, 1), end: endOf(2027, 12, 31) });
    });

    it("depuis un 29 février, ne déborde pas sur mars", () => {
      setNow(2028, 2, 29);
      expect(getDateRange("year", 1)).toEqual({ start: startOf(2029, 1, 1), end: endOf(2029, 12, 31) });
    });

    it("au 31 décembre 23:59:59.999, reste dans l'année courante", () => {
      setNow(2026, 12, 31, 23, 59, 59, 999);
      expect(getDateRange("year")).toEqual({ start: startOf(2026, 1, 1), end: endOf(2026, 12, 31) });
    });

    it("au 1er janvier à minuit pile, reste dans l'année courante", () => {
      setNow(2026, 1, 1, 0, 0, 0, 0);
      expect(getDateRange("year")).toEqual({ start: startOf(2026, 1, 1), end: endOf(2026, 12, 31) });
    });
  });

  describe("intervalle inconnu (ex. custom)", () => {
    it("va de minuit aujourd'hui à maintenant", () => {
      expect(getDateRange("custom")).toEqual({ start: startOf(2026, 10, 1), end: iso(local(2026, 10, 1, 12)) });
    });

    it("ignore l'offset", () => {
      expect(getDateRange("custom", 4)).toEqual(getDateRange("custom", 0));
    });

    it("une chaîne vide est traitée comme un intervalle inconnu", () => {
      expect(getDateRange("")).toEqual({ start: startOf(2026, 10, 1), end: iso(local(2026, 10, 1, 12)) });
    });
  });

  it("renvoie toujours des chaînes ISO valides, début <= fin, pour chaque intervalle borné", () => {
    for (const range of ["today", "week", "month", "1m", "season", "6m", "year", "custom"]) {
      for (const offset of [-3, 0, 2]) {
        const { start, end } = getDateRange(range, offset);
        expect(new Date(start!).toISOString()).toBe(start);
        expect(new Date(end!).toISOString()).toBe(end);
        expect(new Date(start!).getTime()).toBeLessThanOrEqual(new Date(end!).getTime());
      }
    }
  });

  it("l'offset par défaut vaut 0", () => {
    for (const range of ["today", "week", "month", "season", "year", "1m", "6m"]) {
      expect(getDateRange(range)).toEqual(getDateRange(range, 0));
    }
  });
});

describe("getRangeLabel", () => {
  it("lifetime : libellé de tout l'historique", () => {
    expect(getRangeLabel("lifetime", 0)).toBe("Tout l'historique");
  });

  it("lifetime : l'offset n'a pas d'effet", () => {
    expect(getRangeLabel("lifetime", -3)).toBe("Tout l'historique");
  });

  it("today : date au format fr-FR", () => {
    expect(getRangeLabel("today", 0)).toBe("01/10/2026");
  });

  it("today : tient compte de l'offset à travers la fin de mois", () => {
    expect(getRangeLabel("today", -1)).toBe("30/09/2026");
  });

  it("month : nom du mois capitalisé suivi de l'année", () => {
    expect(getRangeLabel("month", 0)).toBe("Octobre 2026");
    expect(getRangeLabel("month", -1)).toBe("Septembre 2026");
  });

  it("month : passe à l'année suivante avec l'offset", () => {
    expect(getRangeLabel("month", 3)).toBe("Janvier 2027");
  });

  it("month : mois accentué (février, août, décembre)", () => {
    setNow(2026, 2, 10);
    expect(getRangeLabel("month", 0)).toBe("Février 2026");
    expect(getRangeLabel("month", 6)).toBe("Août 2026");
    expect(getRangeLabel("month", 10)).toBe("Décembre 2026");
  });

  it("season : automne pour septembre à novembre", () => {
    expect(getRangeLabel("season", 0)).toBe("Automne 2026");
  });

  it("season : été, hiver, printemps selon l'offset", () => {
    expect(getRangeLabel("season", -1)).toBe("Été 2026");
    expect(getRangeLabel("season", 1)).toBe("Hiver 2026");
    expect(getRangeLabel("season", 2)).toBe("Printemps 2027");
  });

  it("season : l'hiver en janvier est rattaché à l'année de son début (décembre précédent)", () => {
    setNow(2026, 1, 15);
    expect(getRangeLabel("season", 0)).toBe("Hiver 2025");
  });

  it("year : année seule", () => {
    expect(getRangeLabel("year", 0)).toBe("2026");
    expect(getRangeLabel("year", -1)).toBe("2025");
  });

  it("week : jours de début et de fin avec l'année (lundi au dimanche)", () => {
    setNow(2026, 10, 11);
    expect(getRangeLabel("week", 0)).toBe("5 oct. – 11 oct. 2026");
    expect(getRangeLabel("week", 1)).toBe("12 oct. – 18 oct. 2026");
  });

  it("week : à cheval sur deux années, les deux années sont indiquées", () => {
    setNow(2026, 1, 1);
    expect(getRangeLabel("week", 0)).toBe("29 déc. 2025 – 4 janv. 2026");
  });

  it("1m : « 30 derniers jours » pour la période courante, les dates sinon", () => {
    expect(getRangeLabel("1m", 0)).toBe("30 derniers jours");
    expect(getRangeLabel("1m", -1)).toBe("3 août – 1 sept. 2026");
  });

  it("6m : « 6 derniers mois » pour la période courante, les mois sinon", () => {
    expect(getRangeLabel("6m", 0)).toBe("6 derniers mois");
    expect(getRangeLabel("6m", -1)).toBe("nov. 2025 – avr. 2026");
  });

  it.each(["today", "week", "month", "season", "1m", "6m", "year", "lifetime"])(
    "%j : renvoie toujours un libellé non vide (pas de dates éditables)", (range) => {
      for (const offset of [-2, 0, 1]) expect(getRangeLabel(range, offset)).toBeTruthy();
    });

  it.each(["custom", ""])("%j : pas de libellé (null) : seule la période personnalisée affiche des dates", (range) => {
    expect(getRangeLabel(range, 0)).toBeNull();
  });
});

describe("smoothHourlyData", () => {
  const hours = (overrides: Record<number, number> = {}) =>
    Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, value: overrides[i] ?? 0, streams: 1 }));
  const values = (d: { value: number }[]) => d.map((x) => x.value);
  const total = (d: { value: number }[]) => d.reduce((sum, x) => sum + x.value, 0);

  it("ne change rien quand aucune heure ne dépasse 60 (60 inclus)", () => {
    const raw = hours({ 5: 60, 6: 59, 7: 0 });
    expect(values(smoothHourlyData(raw))).toEqual(values(raw));
  });

  it("plafonne chaque heure à 60 et reporte le surplus sur l'heure suivante", () => {
    const out = smoothHourlyData(hours({ 10: 75 }));
    expect(out[10].value).toBe(60);
    expect(out[11].value).toBe(15);
  });

  it("aucune heure ne dépasse 60 et le total est conservé", () => {
    const raw = hours({ 2: 90, 9: 130, 20: 61, 21: 300 });
    const out = smoothHourlyData(raw);
    expect(Math.max(...values(out))).toBeLessThanOrEqual(60);
    expect(total(out)).toBe(total(raw));
  });

  it("23h déborde sur 0h (cycle du cadran)", () => {
    const out = smoothHourlyData(hours({ 23: 100 }));
    expect(out[23].value).toBe(60);
    expect(out[0].value).toBe(40);
  });

  it("reporte en chaîne : une heure pleine laisse passer le surplus à la suivante", () => {
    const out = smoothHourlyData(hours({ 8: 150, 9: 50 }));
    expect(out.slice(8, 12).map((x) => x.value)).toEqual([60, 60, 60, 20]);
  });

  it("le report passe par minuit et comble les premières heures déjà occupées", () => {
    const out = smoothHourlyData(hours({ 22: 200, 23: 50, 0: 50 }));
    expect(out[22].value).toBe(60);
    expect(out[23].value).toBe(60);
    expect(out[0].value).toBe(60);
    expect(out[1].value).toBe(60);
    expect(out[2].value).toBe(60);
    expect(total(out)).toBe(300);
  });

  it("une journée de 24 heures pleines est inchangée et une heure à 1440 est répartie partout", () => {
    const out = smoothHourlyData(hours({ 13: 1440 }));
    expect(values(out)).toEqual(Array(24).fill(60));
  });

  it("au-delà de 24 * 60 minutes, tout est plafonné à 60 et le reste est perdu", () => {
    const out = smoothHourlyData(hours({ 3: 2000 }));
    expect(values(out)).toEqual(Array(24).fill(60));
  });

  it("conserve les autres champs (hour, streams)", () => {
    expect(smoothHourlyData(hours({ 4: 80 }))[4]).toMatchObject({ hour: "4h", streams: 1 });
  });

  it("ne modifie pas l'entrée", () => {
    const raw = hours({ 10: 75, 23: 100 });
    const copy = JSON.parse(JSON.stringify(raw));
    smoothHourlyData(raw);
    expect(raw).toEqual(copy);
  });

  it("renvoie tel quel un tableau vide ou de moins de 24 entrées, sans planter", () => {
    expect(smoothHourlyData([])).toEqual([]);
    const short = [{ hour: "0h", value: 500, streams: 1 }];
    expect(smoothHourlyData(short)).toBe(short);
  });
});
