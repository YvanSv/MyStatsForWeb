import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../../../constants/locales/lang";
import { ErrorState } from "./Error";

const dict = languages.fr.error;

const { router } = vi.hoisted(() => ({ router: { push: vi.fn(), back: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

beforeEach(() => vi.clearAllMocks());

describe("ErrorState – contenu selon le statut", () => {
  it("affiche l'erreur par défaut sans statut", () => {
    render(<ErrorState />);
    expect(screen.getByRole("heading", { level: 2, name: dict.titleDefault })).toBeInTheDocument();
    expect(screen.getByText(dict.messageDefault)).toBeInTheDocument();
  });

  it("affiche le message par défaut personnalisé quand message est fourni (statut inconnu)", () => {
    render(<ErrorState status={500} message="Serveur en panne" />);
    expect(screen.getByText("Serveur en panne")).toBeInTheDocument();
    expect(screen.queryByText(dict.messageDefault)).not.toBeInTheDocument();
  });

  it("affiche l'erreur 403 (profil privé)", () => {
    render(<ErrorState status={403} />);
    expect(screen.getByRole("heading", { name: dict.title1 })).toBeInTheDocument();
    expect(screen.getByText(dict.message1)).toBeInTheDocument();
  });

  it("affiche l'erreur 404 (introuvable)", () => {
    render(<ErrorState status={404} />);
    expect(screen.getByRole("heading", { name: dict.title2 })).toBeInTheDocument();
    expect(screen.getByText(dict.message2)).toBeInTheDocument();
  });

  it.each([403, 404, 500])("le titre et le message explicites priment (statut %i)", (status) => {
    render(<ErrorState status={status} title="Mon titre" message="Mon message" />);
    expect(screen.getByRole("heading", { name: "Mon titre" })).toBeInTheDocument();
    expect(screen.getByText("Mon message")).toBeInTheDocument();
  });

  it("utilise une icône verte pour 403 et rouge pour 404 / défaut", () => {
    const { container, rerender } = render(<ErrorState status={403} />);
    expect(container.querySelector("svg.text-vert")).toBeInTheDocument();
    rerender(<ErrorState status={404} />);
    expect(container.querySelector("svg.text-rouge")).toBeInTheDocument();
    rerender(<ErrorState />);
    expect(container.querySelector("svg.text-rouge")).toBeInTheDocument();
  });
});

describe("ErrorState – actions", () => {
  it("propose Réessayer quand onRetry est fourni et l'appelle", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.queryByRole("button", { name: new RegExp(dict.backhome) })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: new RegExp(dict.retry) }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("propose Retour à l'accueil sans onRetry et redirige vers /", async () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button", { name: new RegExp(dict.retry) })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: new RegExp(dict.backhome) }));
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("revient à la page précédente", async () => {
    render(<ErrorState onRetry={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: dict.backpage }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
