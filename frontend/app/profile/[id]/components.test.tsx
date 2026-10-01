/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { languages } from "../../constants/locales/lang";
import { HorizontalTopSection, StatCard, TopStatCard } from "./components";

vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const t = languages.fr;
const fmt = (n: number) => n.toLocaleString(t.common.locale).replace(/\s/g, " ");
const ratingEl = (r: number) => screen.getAllByText(`${fmt(r)}★`).find((e) => e.className.includes("text-3xl"))!;

const item = (o: any = {}) => ({
  name: "Titre A", image_url: "a.jpg", rating: 1.5, count: 1234, minutes: 5678, engagement: 42,
  artist_name: "Artiste", album_name: "Album", ...o,
});

describe("StatCard", () => {
  it("affiche titre, valeur et sous-titre avec la classe de couleur", () => {
    render(<StatCard title="Titre" value="42" sub="Sous" color="text-blue-400" />);
    expect(screen.getByText("Titre")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("42");
    expect(screen.getByRole("heading", { level: 3 })).toHaveClass("text-blue-400");
    expect(screen.getByText("Sous")).toBeInTheDocument();
  });

  it("accepte un noeud React comme valeur", () => {
    render(<StatCard title="t" value={<b>gras</b>} sub="s" color="c" />);
    expect(screen.getByText("gras").tagName).toBe("B");
  });

  it("accepte la valeur 0 et les chaînes vides", () => {
    render(<StatCard title="" value={0} sub="" color="" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("0");
  });
});

describe("TopStatCard", () => {
  const top = { name: "Morceau", img_url: "m.jpg", rating: 88, isTrack: true, artist_name: "Art", album_name: "Alb" };

  it("affiche le spinner de chargement quand l'item est null et que le chargement est en cours", () => {
    const { container } = render(<TopStatCard color="c" item={null} loading />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it.each([[null], [undefined]])("affiche « — » sans spinner quand l'item est %s et que le chargement est terminé", (value) => {
    const { container } = render(<TopStatCard color="c" item={value} />);
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(screen.getByTestId("top-stat-empty")).toHaveTextContent("—");
  });

  it("affiche les données plutôt que le spinner même si le chargement est signalé", () => {
    const { container } = render(<TopStatCard color="c" item={top} loading />);
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(screen.getByText("Morceau")).toBeInTheDocument();
  });

  it.each([[""], [null]])("remplace l'image absente (%j) par un bloc neutre", (img_url) => {
    render(<TopStatCard color="c" item={{ ...top, img_url: img_url as any }} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByTestId("top-stat-image-fallback")).toBeInTheDocument();
    expect(screen.getByText("Morceau")).toBeInTheDocument();
  });

  it("affiche nom, note, image, artiste et album pour un morceau", () => {
    render(<TopStatCard color="text-orange-400" item={top} />);
    expect(screen.getByRole("img", { name: "Morceau" })).toHaveAttribute("src", "m.jpg");
    expect(screen.getByRole("heading", { name: "Morceau" })).toBeInTheDocument();
    expect(screen.getByText("Art")).toBeInTheDocument();
    expect(screen.getByText("Alb")).toBeInTheDocument();
    expect(screen.getByText(/88/)).toHaveClass("text-orange-400");
    expect(screen.getByText("/100")).toBeInTheDocument();
  });

  it("masque artiste et album quand ce n'est pas un morceau", () => {
    render(<TopStatCard color="c" item={{ ...top, isTrack: false }} />);
    expect(screen.queryByText("Art")).toBeNull();
    expect(screen.queryByText("Alb")).toBeNull();
    expect(screen.getByText("Morceau")).toBeInTheDocument();
  });

  it("gère une note de 0", () => {
    render(<TopStatCard color="c" item={{ ...top, rating: 0 }} />);
    expect(screen.getByText(/^0/)).toBeInTheDocument();
  });
});

describe("HorizontalTopSection", () => {
  it("affiche le titre et rien d'autre quand la liste est vide", () => {
    render(<HorizontalTopSection title="Mes tops" items={[]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Mes tops" })).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("affiche rang, nom, note et image pour chaque item", () => {
    render(<HorizontalTopSection title="T" items={[item(), item({ name: "Titre B", rating: 0.9 })]} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("Titre B")).toBeInTheDocument();
    expect(screen.getByText("0.9★")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Titre A" })).toHaveAttribute("src", "a.jpg");
  });

  it.each([[null], [""], [undefined]])("remplace l'image %j d'un élément par un bloc neutre, dans la liste et la modale", async (image_url) => {
    const user = userEvent.setup();
    const { container } = render(<HorizontalTopSection title="T" items={[item({ image_url })]} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByTestId("top-image-fallback")).toBeInTheDocument();
    await user.click(screen.getByText("Titre A"));
    expect(screen.getByTestId("modal-image-fallback")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(document.querySelector("[style*='background-image']")).toBeNull();
  });

  it("ouvre la modale avec les statistiques formatées au clic", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item()]} />);
    await user.click(screen.getByText("Titre A"));
    expect(screen.getByRole("heading", { level: 3, name: "Titre A" })).toBeInTheDocument();
    expect(screen.getByText("Album ● Artiste")).toBeInTheDocument();
    expect(screen.getByText(fmt(1234))).toBeInTheDocument();
    expect(screen.getByText(fmt(5678))).toBeInTheDocument();
    expect(screen.getByText(`${fmt(42)}%`)).toBeInTheDocument();
    expect(ratingEl(1.5)).toBeInTheDocument();
    expect(screen.getByText(t.common.streams)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.ranking.closeBtn })).toBeInTheDocument();
  });

  it("affiche seulement l'artiste quand il n'y a pas d'album", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item({ album_name: undefined })]} />);
    await user.click(screen.getByText("Titre A"));
    expect(screen.getByText("Artiste")).toBeInTheDocument();
    expect(screen.queryByText(/●/)).toBeNull();
  });

  it("utilise des valeurs de repli pour les données manquantes", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item({ count: undefined, minutes: undefined, engagement: undefined, rating: undefined })]} />);
    await user.click(screen.getByText("Titre A"));
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(`${fmt(0)}%`)).toBeInTheDocument();
    expect(ratingEl(0)).toBeInTheDocument();
  });

  it("affiche « 0 » pour un compteur à 0 (valeur limite)", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item({ count: 0, minutes: 5 })]} />);
    await user.click(screen.getByText("Titre A"));
    expect(screen.queryByText("—")).toBeNull();
  });

  it.each([
    [1.35, "text2"],
    [2, "text2"],
    [1.34, "text-jaune"],
    [0.8, "text-jaune"],
    [0.79, "text-rouge"],
    [0, "text-rouge"],
  ])("colore la note %s avec %s", async (rating, cls) => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item({ rating })]} />);
    await user.click(screen.getByText("Titre A"));
    expect(ratingEl(rating)).toHaveClass(cls);
  });

  it("ferme la modale via le bouton Fermer", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item()]} />);
    await user.click(screen.getByText("Titre A"));
    await user.click(screen.getByRole("button", { name: t.ranking.closeBtn }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 3 })).toBeNull());
  });

  it("ferme la modale via un clic sur l'overlay", async () => {
    const user = userEvent.setup();
    const { container } = render(<HorizontalTopSection title="T" items={[item()]} />);
    await user.click(screen.getByText("Titre A"));
    await user.click(container.querySelector(".bg-black\\/80") as Element);
    await waitFor(() => expect(screen.queryByRole("heading", { level: 3 })).toBeNull());
  });

  it("remplace la modale en cliquant sur un autre item", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item(), item({ name: "Titre B" })]} />);
    await user.click(screen.getByText("Titre B"));
    expect(screen.getByRole("heading", { level: 3, name: "Titre B" })).toBeInTheDocument();
  });

  // Accessibilité
  it("expose la modale comme un dialogue", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item()]} />);
    await user.click(screen.getByText("Titre A"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ferme la modale avec la touche Échap", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item()]} />);
    await user.click(screen.getByText("Titre A"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("heading", { level: 3 })).toBeNull());
  });

  it("rend chaque item atteignable et activable au clavier", async () => {
    const user = userEvent.setup();
    render(<HorizontalTopSection title="T" items={[item()]} />);
    await user.tab();
    expect(screen.getByRole("button", { name: /Titre A/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { level: 3, name: "Titre A" })).toBeInTheDocument();
  });
});
