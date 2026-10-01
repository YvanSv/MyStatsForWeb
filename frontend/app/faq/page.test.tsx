import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import FAQPage from "./page";

const h = vi.hoisted(() => ({ lang: "fr" as "fr" | "en" }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[h.lang], language: h.lang, changeLanguage: vi.fn() }) };
});

const getItems = () => screen.getAllByRole("button").filter((b) => b.hasAttribute("aria-expanded"));

describe("FAQPage", () => {
  beforeEach(() => {
    h.lang = "fr";
  });

  it("affiche le titre et la phrase d'introduction", () => {
    render(<FAQPage />);
    expect(screen.getByRole("heading", { level: 1, name: "FAQ" })).toBeInTheDocument();
    expect(screen.getByText(/Tout ce que vous devez savoir/)).toBeInTheDocument();
  });

  it("affiche les 7 questions sous forme de boutons", () => {
    render(<FAQPage />);
    expect(getItems()).toHaveLength(7);
    expect(screen.getByRole("button", { name: /Comment sont calculés mes classements/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Comment puis-je supprimer mon compte/ })).toBeInTheDocument();
  });

  it("ouvre la première question par défaut et ferme les autres", () => {
    render(<FAQPage />);
    const items = getItems();
    expect(items[0]).toHaveAttribute("aria-expanded", "true");
    items.slice(1).forEach((b) => expect(b).toHaveAttribute("aria-expanded", "false"));
  });

  it("ouvre une question au clic et referme la précédente (un seul panneau ouvert)", async () => {
    const user = userEvent.setup();
    render(<FAQPage />);
    const items = getItems();
    await user.click(items[2]);
    expect(items[2]).toHaveAttribute("aria-expanded", "true");
    expect(items[0]).toHaveAttribute("aria-expanded", "false");
    expect(items.filter((b) => b.getAttribute("aria-expanded") === "true")).toHaveLength(1);
  });

  it("referme la question ouverte quand on clique de nouveau dessus", async () => {
    const user = userEvent.setup();
    render(<FAQPage />);
    const items = getItems();
    await user.click(items[0]);
    expect(items[0]).toHaveAttribute("aria-expanded", "false");
    expect(items.every((b) => b.getAttribute("aria-expanded") === "false")).toBe(true);
  });

  it("est utilisable au clavier (Entrée et Espace)", async () => {
    const user = userEvent.setup();
    render(<FAQPage />);
    const items = getItems();
    items[3].focus();
    await user.keyboard("{Enter}");
    expect(items[3]).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(items[3]).toHaveAttribute("aria-expanded", "false");
  });

  it("relie chaque bouton à son panneau de réponse (aria-controls)", () => {
    render(<FAQPage />);
    for (const b of getItems()) {
      const id = b.getAttribute("aria-controls");
      expect(id).toBeTruthy();
      expect(document.getElementById(id!)).not.toBeNull();
    }
  });

  it("n'expose aux lecteurs d'écran que la réponse ouverte", async () => {
    const user = userEvent.setup();
    render(<FAQPage />);
    const items = getItems();
    const panel = (i: number) => document.getElementById(items[i].getAttribute("aria-controls")!)!;
    expect(panel(0)).toHaveAttribute("aria-hidden", "false");
    expect(panel(1)).toHaveAttribute("aria-hidden", "true");
    await user.click(items[1]);
    expect(panel(1)).toHaveAttribute("aria-hidden", "false");
    expect(panel(0)).toHaveAttribute("aria-hidden", "true");
    expect(within(panel(1)).getByText(/sécurité de votre vie privée/)).toBeInTheDocument();
  });

  it("affiche la section de contact avec un bouton", () => {
    render(<FAQPage />);
    expect(screen.getByText("Vous ne trouvez pas votre réponse ?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nous contacter" })).toBeInTheDocument();
  });

  it("affiche les textes en anglais quand la langue est en", () => {
    h.lang = "en";
    render(<FAQPage />);
    expect(screen.getByText(languages.en.faq.subtitle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: languages.en.faq.q1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: languages.en.faq.contact })).toBeInTheDocument();
    expect(screen.queryByText("Nous contacter")).toBeNull();
  });

  it("a une question et une réponse non vides pour chaque entrée dans les deux langues", () => {
    for (const lang of ["fr", "en"] as const) {
      const faq = languages[lang].faq as Record<string, string>;
      for (let i = 1; i <= 7; i++) {
        expect(faq[`q${i}`]).toBeTruthy();
        expect(faq[`a${i}`]).toBeTruthy();
      }
      expect(faq.q8).toBeUndefined();
    }
  });

  describe("hauteur du panneau de réponse", () => {
    const panel = (i: number) => document.getElementById(getItems()[i].getAttribute("aria-controls")!)!;

    it("n'impose aucune hauteur maximale fixe (une réponse longue ne peut pas être coupée)", () => {
      render(<FAQPage />);
      for (let i = 0; i < getItems().length; i++) expect(panel(i).className).not.toMatch(/max-h-/);
    });

    it("le panneau ouvert s'étend à la hauteur de son contenu, les autres sont repliés", () => {
      render(<FAQPage />);
      expect(panel(0).className).toContain("grid-rows-[1fr]");
      expect(panel(1).className).toContain("grid-rows-[0fr]");
    });

    it("ouvrir une question déplie son panneau et replie le précédent", async () => {
      const user = userEvent.setup();
      render(<FAQPage />);
      await user.click(getItems()[3]);
      expect(panel(3).className).toContain("grid-rows-[1fr]");
      expect(panel(0).className).toContain("grid-rows-[0fr]");
    });

    it("le contenu est dans un conteneur qui masque le débordement pendant l'animation", () => {
      render(<FAQPage />);
      expect(panel(0).firstElementChild!.className).toContain("overflow-hidden");
    });

    it("la réponse complète reste dans le DOM, sans troncature du texte", () => {
      render(<FAQPage />);
      const answer = (languages.fr.faq as Record<string, string>).a5;
      expect(panel(4).textContent).toBe(answer);
    });
  });
});
