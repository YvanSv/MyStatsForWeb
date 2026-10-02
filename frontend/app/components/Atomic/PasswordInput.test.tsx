import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("masque le mot de passe puis l'affiche au clic sur l'œil", async () => {
    render(<PasswordInput id="pw" aria-label="champ" showLabel="Afficher" hideLabel="Masquer" defaultValue="secret" buttonClassName="extra"/>);
    const input = screen.getByLabelText("champ");
    const button = screen.getByRole("button", { name: "Afficher" });
    expect(input).toHaveAttribute("type", "password");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveClass("extra");

    await userEvent.setup().click(button);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Masquer" })).toHaveAttribute("aria-pressed", "true");
  });

  it("transmet les attributs au champ", () => {
    render(<PasswordInput id="pw" aria-invalid={true} aria-describedby="pw-err" showLabel="a" hideLabel="b" className="c1"/>);
    const input = document.getElementById("pw")!;
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "pw-err");
    expect(input).toHaveClass("c1");
  });
});
