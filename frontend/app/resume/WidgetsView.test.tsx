/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WidgetsView } from "./WidgetsView";
import type { DataFormat } from "./interfaces";

const data = (over: Record<string, any> = {}): DataFormat => ({
  user: { display_name: "Yvan", bio: "Ma bio", avatar: "a.png", banner: "b.png", perms: [] },
  topArtists: [], topTracks: [], topAlbums: [],
  minutes: 1234567, streams: 9876, distinct_tracks: 12, distinct_albums: 3, distinct_artists: 1,
  ...over,
});

const section = (name: string) => screen.getByRole("button", { name });
const openAll = async () => {
  await userEvent.click(section("Compte"));
  await userEvent.click(section("Stats"));
};
// Carte déplaçable contenant un titre donné
const card = (title: string) => screen.getByText(title).closest("[draggable]") as HTMLElement;

const drag = (el: HTMLElement) => {
  const store: Record<string, string> = {};
  const dataTransfer = {
    setData: (k: string, v: string) => { store[k] = v; },
    getData: (k: string) => store[k],
    effectAllowed: "",
  };
  const ev = createEvent.dragStart(el);
  Object.defineProperty(ev, "dataTransfer", { value: dataTransfer });
  fireEvent(el, ev);
  return dataTransfer;
};

describe("WidgetsView – rendu", () => {
  it("affiche le titre de la liste et deux sections d'accordéon", () => {
    render(<WidgetsView resumeData={data()} />);
    expect(screen.getByText("Widgets disponibles")).toBeInTheDocument();
    expect(section("Compte")).toBeInTheDocument();
    expect(section("Stats")).toBeInTheDocument();
  });

  it("affiche les 4 cartes du compte et 5 cartes de stats", () => {
    render(<WidgetsView resumeData={data()} />);
    ["Photo de profil", "Pseudonyme", "Fond d'écran", "Description",
      "Temps d'écoute", "Nombre de streams", "Titres différents", "Albums différents", "Artistes différents"]
      .forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
    expect(document.querySelectorAll("[draggable=true]")).toHaveLength(9);
  });

  it("affiche les sous-titres calculés à partir des données", () => {
    render(<WidgetsView resumeData={data()} />);
    expect(screen.getByText("12 MORCEAUX UNIQUES".toLowerCase(), { exact: false })).toBeInTheDocument();
    expect(screen.getByText("3 albums uniques")).toBeInTheDocument();
    expect(screen.getByText("1 artistes uniques")).toBeInTheDocument();
    expect(screen.getByText(/écoutes$/)).toBeInTheDocument();
    expect(screen.getByText(/ min$/)).toBeInTheDocument();
  });

  it("formate minutes et streams avec le séparateur de milliers local", () => {
    render(<WidgetsView resumeData={data()} />);
    expect(screen.getByText(`${(1234567).toLocaleString()} min`)).toBeInTheDocument();
    expect(screen.getByText(`${(9876).toLocaleString()} écoutes`)).toBeInTheDocument();
  });

  it("gère des statistiques à 0", () => {
    render(<WidgetsView resumeData={data({ minutes: 0, streams: 0, distinct_tracks: 0, distinct_albums: 0, distinct_artists: 0 })} />);
    expect(screen.getByText("0 min")).toBeInTheDocument();
    expect(screen.getByText("0 écoutes")).toBeInTheDocument();
    expect(screen.getByText("0 morceaux uniques")).toBeInTheDocument();
  });

});

describe("WidgetsView – accordéon", () => {
  it("les sections sont repliées par défaut", () => {
    render(<WidgetsView resumeData={data()} />);
    expect(section("Compte").nextElementSibling?.className).toContain("max-h-0");
    expect(section("Stats").nextElementSibling?.className).toContain("max-h-0");
  });

  it("un clic déplie puis replie la section", async () => {
    render(<WidgetsView resumeData={data()} />);
    await userEvent.click(section("Compte"));
    expect(section("Compte").nextElementSibling?.className).toContain("max-h-[500px]");
    await userEvent.click(section("Compte"));
    expect(section("Compte").nextElementSibling?.className).toContain("max-h-0");
  });

  it("les sections sont indépendantes", async () => {
    render(<WidgetsView resumeData={data()} />);
    await userEvent.click(section("Stats"));
    expect(section("Stats").nextElementSibling?.className).toContain("max-h-[500px]");
    expect(section("Compte").nextElementSibling?.className).toContain("max-h-0");
  });

  it("est pilotable au clavier (Tab, Entrée, Espace)", async () => {
    const user = userEvent.setup();
    render(<WidgetsView resumeData={data()} />);
    await user.tab();
    expect(section("Compte")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(section("Compte").nextElementSibling?.className).toContain("max-h-[500px]");
    await user.keyboard(" ");
    expect(section("Compte").nextElementSibling?.className).toContain("max-h-0");
  });

  it("expose l'état déplié via aria-expanded", async () => {
    render(<WidgetsView resumeData={data()} />);
    expect(section("Compte")).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(section("Compte"));
    expect(section("Compte")).toHaveAttribute("aria-expanded", "true");
  });

});

describe("WidgetsView – glisser-déposer", () => {
  it.each([
    ["Photo de profil", "profile_picture", (d: DataFormat) => d.user],
    ["Pseudonyme", "username", (d: DataFormat) => d.user.display_name],
    ["Fond d'écran", "background", (d: DataFormat) => d.user.banner],
    ["Description", "bio", (d: DataFormat) => d.user.bio],
    ["Temps d'écoute", "minutes", (d: DataFormat) => d.minutes],
    ["Nombre de streams", "streams", (d: DataFormat) => d.streams],
    ["Titres différents", "nb_tracks", (d: DataFormat) => d.distinct_tracks],
    ["Albums différents", "nb_albums", (d: DataFormat) => d.distinct_albums],
    ["Artistes différents", "nb_artists", (d: DataFormat) => d.distinct_artists],
  ])("glisser « %s » transmet le type %s et ses données sérialisées", async (title, type, pick) => {
    const d = data();
    render(<WidgetsView resumeData={d} />);
    await openAll();
    const dt = drag(card(title));
    expect(dt.getData("widgetType")).toBe(type);
    expect(JSON.parse(dt.getData("widgetData"))).toEqual(pick(d));
    expect(dt.effectAllowed).toBe("move");
  });

  it("les cartes sont marquées draggable", () => {
    render(<WidgetsView resumeData={data()} />);
    expect(card("Pseudonyme")).toHaveAttribute("draggable", "true");
  });

  it("sérialise une bio absente (undefined) sans planter", () => {
    const d = data();
    delete (d.user as any).bio;
    render(<WidgetsView resumeData={d} />);
    expect(() => drag(card("Description"))).not.toThrow();
  });

  // Défaut connu : les cartes ne se déplacent qu'à la souris ; une alternative clavier (bouton « Ajouter ») reste à concevoir
  it.todo("les cartes ont une alternative clavier au glisser-déposer");
});
