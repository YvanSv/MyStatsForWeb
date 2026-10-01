import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MergeRequestPage from "./page";

describe("MergeRequestPage (détail)", () => {
  it("affiche le titre et le sous-titre", () => {
    render(<MergeRequestPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Merge Request" })).toBeInTheDocument();
    expect(screen.getByText(/Analyse multi-niveaux/)).toBeInTheDocument();
  });

  it("affiche les boutons Annuler et Confirmer la fusion", () => {
    render(<MergeRequestPage />);
    expect(screen.getByRole("button", { name: /Annuler la fusion/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmer la fusion/ })).toBeInTheDocument();
  });

  it("affiche l'avertissement d'irréversibilité", () => {
    render(<MergeRequestPage />);
    expect(screen.getByRole("heading", { level: 3, name: "Impact de la fusion" })).toBeInTheDocument();
    expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument();
  });

  it("affiche deux panneaux : source et hôte", () => {
    render(<MergeRequestPage />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("chaque panneau liste Albums, Tous les Tracks et Tout l'Historique avec leur compteur", () => {
    render(<MergeRequestPage />);
    for (const label of ["Albums", "Tous les Tracks", "Tout l'Historique"]) {
      const buttons = screen.getAllByRole("button", { name: new RegExp(label) });
      expect(buttons).toHaveLength(2);
      buttons.forEach((b) => expect(within(b).getByText("1")).toBeInTheDocument());
    }
  });

  it("affiche l'ID et le mapping de l'entité", () => {
    render(<MergeRequestPage />);
    expect(screen.getAllByText(/ID: dup_123/)).toHaveLength(2);
    expect(screen.getAllByText("Spotify:").length).toBeGreaterThan(0);
  });

  it("les sections sont repliées par défaut", () => {
    render(<MergeRequestPage />);
    expect(screen.queryByText("Discovery")).toBeNull();
    expect(screen.queryByText("One More Time")).toBeNull();
  });

  it("déplier Albums affiche les albums, puis un clic les replie", async () => {
    const user = userEvent.setup();
    render(<MergeRequestPage />);
    const [btn] = screen.getAllByRole("button", { name: /^Albums/ });
    await user.click(btn);
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    await user.click(btn);
    expect(screen.queryByText("Discovery")).toBeNull();
  });

  it("déplier un album affiche ses tracks, déplier un track affiche l'historique", async () => {
    const user = userEvent.setup();
    render(<MergeRequestPage />);
    await user.click(screen.getAllByRole("button", { name: /^Albums/ })[0]);
    await user.click(screen.getByRole("button", { name: "Discovery" }));
    const track = screen.getByRole("button", { name: "One More Time" });
    expect(track).toBeInTheDocument();
    await user.click(track);
    expect(screen.getByText(/Écoute le 2023-10-01/)).toBeInTheDocument();
    expect(screen.getByText(/via SPOTIFY/)).toBeInTheDocument();
  });

  it("déplier Tous les Tracks affiche les tracks à plat", async () => {
    const user = userEvent.setup();
    render(<MergeRequestPage />);
    await user.click(screen.getAllByRole("button", { name: /Tous les Tracks/ })[0]);
    expect(screen.getByRole("button", { name: "One More Time" })).toBeInTheDocument();
  });

  it("déplier Tout l'Historique affiche date et provider", async () => {
    const user = userEvent.setup();
    render(<MergeRequestPage />);
    await user.click(screen.getAllByRole("button", { name: /Tout l'Historique/ })[0]);
    expect(screen.getByText("2023-10-01")).toBeInTheDocument();
    expect(screen.getByText("SPOTIFY")).toBeInTheDocument();
  });

  it("déplier un panneau n'affecte pas l'autre", async () => {
    const user = userEvent.setup();
    render(<MergeRequestPage />);
    await user.click(screen.getAllByRole("button", { name: /^Albums/ })[0]);
    expect(screen.getAllByText("Discovery")).toHaveLength(1);
  });

  it("les lignes dépliables sont utilisables au clavier", async () => {
    const user = userEvent.setup();
    render(<MergeRequestPage />);
    screen.getAllByRole("button", { name: /^Albums/ })[0].focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    await user.keyboard(" ");
    expect(screen.queryByText("Discovery")).toBeNull();
  });

  it("les lignes dépliables exposent leur état (aria-expanded)", () => {
    render(<MergeRequestPage />);
    const [btn] = screen.getAllByRole("button", { name: /^Albums/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  // Page encore à l'état de maquette (données codées en dur, boutons sans action)
  it.todo("le duplicate et la cible affichés correspondent à la demande (pas deux fois les mêmes données codées en dur)");

  // Page encore à l'état de maquette (données codées en dur, boutons sans action)
  it.todo("Confirmer la fusion déclenche une action (appel API de résolution)");

  it("les images décoratives ont un alt vide", () => {
    const { container } = render(<MergeRequestPage />);
    container.querySelectorAll("img").forEach((img) => expect(img).toHaveAttribute("alt"));
  });
});
