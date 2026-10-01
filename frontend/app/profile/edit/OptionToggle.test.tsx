/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionToggle } from "./OptionToggle";

const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
});

const setup = (props: Record<string, any> = {}) => {
  const utils = render(
    <OptionToggle title="Titre" description="Description" active={true} onChange={onChange} {...props} />
  );
  const root = utils.container.firstElementChild as HTMLElement;
  const sw = root.children[1] as HTMLElement;
  const knob = sw.firstElementChild as HTMLElement;
  return { ...utils, root, sw, knob };
};

describe("OptionToggle – affichage", () => {
  it("affiche le titre et la description", () => {
    setup();
    expect(screen.getByText("Titre")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("actif : fond vert et pastille à droite", () => {
    const { sw, knob } = setup({ active: true });
    expect(sw).toHaveClass("bg-vert");
    expect(sw).not.toHaveClass("bg-white/10");
    expect(knob).toHaveClass("translate-x-0");
  });

  it("inactif : fond gris et pastille décalée à gauche", () => {
    const { sw, knob } = setup({ active: false });
    expect(sw).toHaveClass("bg-white/10");
    expect(knob).toHaveClass("-translate-x-6");
  });

  it("désactivé : carte atténuée et sans interaction pointeur", () => {
    const { root } = setup({ disabled: true });
    expect(root).toHaveClass("opacity-30", "pointer-events-none");
  });

  it("non désactivé (disabled absent) : opacité pleine", () => {
    const { root } = setup();
    expect(root).toHaveClass("opacity-100");
    expect(root).not.toHaveClass("pointer-events-none");
  });

  it("accepte des titres et descriptions vides sans planter", () => {
    const { root } = setup({ title: "", description: "" });
    expect(root).toBeInTheDocument();
  });
});

describe("OptionToggle – interactions", () => {
  it("un clic sur l'interrupteur actif appelle onChange(false)", async () => {
    const { sw } = setup({ active: true });
    await userEvent.setup().click(sw);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("un clic sur l'interrupteur inactif appelle onChange(true)", async () => {
    const { sw } = setup({ active: false });
    await userEvent.setup().click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("un clic sur la pastille déclenche aussi onChange (bulle)", async () => {
    const { knob } = setup({ active: false });
    await userEvent.setup().click(knob);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("désactivé : un clic n'appelle pas onChange", async () => {
    const { sw } = setup({ disabled: true });
    // pointer-events-none bloque user-event : on désactive la vérification
    await userEvent.setup({ pointerEventsCheck: 0 }).click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("un clic sur le titre ne change rien", async () => {
    setup();
    await userEvent.setup().click(screen.getByText("Titre"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deux clics successifs appellent deux fois onChange avec la même valeur tant que la prop ne change pas", async () => {
    const { sw } = setup({ active: true });
    const user = userEvent.setup();
    await user.click(sw);
    await user.click(sw);
    expect(onChange.mock.calls).toEqual([[false], [false]]);
  });
});

describe("OptionToggle – accessibilité", () => {
  it("expose un rôle switch avec l'état aria-checked", () => {
    setup({ active: true });
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("l'interrupteur est atteignable au clavier (Tab)", async () => {
    setup();
    await userEvent.setup().tab();
    expect(document.activeElement).not.toBe(document.body);
  });

  it("Entrée ou Espace sur l'interrupteur focalisé le bascule", async () => {
    setup({ active: false });
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
