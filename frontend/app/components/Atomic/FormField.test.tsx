import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";

const setup = (error?: string, counter?: React.ReactNode) => render(
  <FormField id="f" label="Nom" labelClassName="lbl" error={error} errorClassName="err" counter={counter}>
    {(field) => <input {...field} />}
  </FormField>
);

describe("FormField", () => {
  it("relie le libellé au champ", () => {
    setup();
    expect(screen.getByLabelText("Nom")).toHaveAttribute("id", "f");
  });

  it("sans prop error, le champ n'a aucun attribut aria", () => {
    setup();
    const input = screen.getByLabelText("Nom");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("error vide : aria-invalid=false et pas de message", () => {
    setup("");
    const input = screen.getByLabelText("Nom");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("erreur : message en alerte relié au champ", () => {
    setup("Trop court");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Trop court");
    expect(alert).toHaveAttribute("id", "f-err");
    expect(alert).toHaveClass("err");
    const input = screen.getByLabelText("Nom");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "f-err");
  });

  it("affiche le compteur à côté du libellé", () => {
    setup(undefined, <span>3/20</span>);
    expect(screen.getByText("3/20").parentElement).toHaveClass("flex", "justify-between");
  });
});
