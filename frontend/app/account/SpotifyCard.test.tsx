import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpotifyCard } from "./SpotifyCard";

const labels = { synchronizedLabel: "Synchronisé", notSynchronizedLabel: "Non synchronisé", linkLabel: "Lier" };

describe("SpotifyCard", () => {
  it("compte lié : badge de succès et email, sans bouton", () => {
    render(<SpotifyCard spotify={{ has: true, email: "a@b.fr" }} onLink={() => {}} {...labels}/>);
    expect(screen.getByText("Synchronisé")).toBeInTheDocument();
    expect(screen.getByText("a@b.fr")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("compte non lié : badge d'erreur et bouton de liaison", async () => {
    const onLink = vi.fn();
    render(<SpotifyCard spotify={{ has: false }} onLink={onLink} {...labels}/>);
    expect(screen.getByText("Non synchronisé")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Lier" }));
    expect(onLink).toHaveBeenCalledTimes(1);
  });
});
