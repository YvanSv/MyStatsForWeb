import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

const onConfirm = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  onConfirm.mockReset();
  onCancel.mockReset();
});

const setup = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) =>
  render(
    <ConfirmDialog
      title="Supprimer le compte"
      description="Tapez SUPPRIMER pour confirmer :"
      expected="SUPPRIMER"
      confirmLabel="Supprimer"
      cancelLabel="Annuler"
      mismatchMessage={(w) => `Recopiez exactement « ${w} ».`}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );

const confirmBtn = () => screen.getByRole("button", { name: "Supprimer" });
const cancelBtn = () => screen.getByRole("button", { name: "Annuler" });
const input = () => screen.getByRole("textbox");

describe("ConfirmDialog – rendu et accessibilité", () => {
  it("expose un dialogue modal nommé par son titre et décrit par son texte", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Supprimer le compte" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Tapez SUPPRIMER pour confirmer :");
  });

  it("donne le focus au champ de saisie à l'ouverture", () => {
    setup();
    expect(input()).toHaveFocus();
  });

  it("affiche le mot attendu en indication dans le champ", () => {
    setup();
    expect(input()).toHaveAttribute("placeholder", "SUPPRIMER");
  });

  it("désactive la saisie semi-automatique du champ", () => {
    setup();
    expect(input()).toHaveAttribute("autocomplete", "off");
  });
});

describe("ConfirmDialog – validation de la saisie", () => {
  it("bloque la confirmation tant que rien n'est saisi, sans message d'erreur", () => {
    setup();
    expect(confirmBtn()).toBeDisabled();
    expect(screen.queryByText(/Recopiez exactement/)).not.toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-invalid", "false");
  });

  it("signale une saisie fausse (message, aria-invalid) et garde la confirmation bloquée", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), "SUPPRIME");
    expect(screen.getByText("Recopiez exactement « SUPPRIMER ».")).toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(input()).toHaveAccessibleDescription(/Recopiez exactement/);
    expect(confirmBtn()).toBeDisabled();
  });

  it.each(["supprimer", " SUPPRIMER", "SUPPRIMER ", "SUPPRIMERR"])("la casse et les espaces comptent : %j est refusé", async (value) => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), value);
    expect(confirmBtn()).toBeDisabled();
  });

  it("active la confirmation et retire le message quand le mot exact est saisi", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), "SUPPRIME");
    await user.type(input(), "R");
    expect(confirmBtn()).toBeEnabled();
    expect(screen.queryByText(/Recopiez exactement/)).not.toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-invalid", "false");
  });

  it("confirme au clic quand le mot est exact", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), "SUPPRIMER");
    await user.click(confirmBtn());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirme avec Entrée quand le mot est exact, pas quand il est faux", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), "faux{Enter}");
    expect(onConfirm).not.toHaveBeenCalled();
    await user.clear(input());
    await user.type(input(), "SUPPRIMER{Enter}");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("ne confirme jamais avec un champ vide", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), "{Enter}");
    await user.click(confirmBtn());
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ConfirmDialog – fermeture", () => {
  it("Annuler appelle onCancel sans confirmer", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(cancelBtn());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Échap appelle onCancel", async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("un clic sur le fond sombre appelle onCancel, un clic dans la fenêtre non", async () => {
    const user = userEvent.setup();
    const { container } = setup();
    await user.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
    await user.click(container.querySelector('[aria-hidden="true"]') as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("retire son écouteur de clavier au démontage", async () => {
    const user = userEvent.setup();
    const { unmount } = setup();
    unmount();
    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("ConfirmDialog – focus", () => {
  it("Tab reste dans la fenêtre : du dernier bouton actif on revient au champ", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), "SUPPRIMER");
    await user.tab();
    expect(cancelBtn()).toHaveFocus();
    await user.tab();
    expect(confirmBtn()).toHaveFocus();
    await user.tab();
    expect(input()).toHaveFocus();
  });

  it("Maj+Tab depuis le champ passe au dernier bouton actif", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab({ shift: true });
    // Confirmer est désactivé tant que la saisie est fausse : le dernier élément actif est Annuler
    expect(cancelBtn()).toHaveFocus();
  });
});

describe("ConfirmDialog – action en cours", () => {
  it("bloque champ, boutons, Échap et clic sur le fond", async () => {
    const user = userEvent.setup();
    const { container } = setup({ busy: true });
    expect(input()).toBeDisabled();
    expect(cancelBtn()).toBeDisabled();
    expect(confirmBtn()).toBeDisabled();
    await user.keyboard("{Escape}");
    await user.click(container.querySelector('[aria-hidden="true"]') as HTMLElement);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("ne confirme pas une seconde fois pendant l'action, même avec Entrée", async () => {
    const user = userEvent.setup();
    const { rerender } = setup();
    await user.type(input(), "SUPPRIMER");
    rerender(
      <ConfirmDialog
        title="Supprimer le compte" description="Tapez SUPPRIMER pour confirmer :" expected="SUPPRIMER"
        confirmLabel="Supprimer" cancelLabel="Annuler" mismatchMessage={(w) => w}
        busy onConfirm={onConfirm} onCancel={onCancel}
      />,
    );
    await user.keyboard("{Enter}");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("garde la saisie pendant l'action", async () => {
    const user = userEvent.setup();
    const { rerender } = setup();
    await user.type(input(), "SUPPRIMER");
    rerender(
      <ConfirmDialog
        title="Supprimer le compte" description="Tapez SUPPRIMER pour confirmer :" expected="SUPPRIMER"
        confirmLabel="Supprimer" cancelLabel="Annuler" mismatchMessage={(w) => w}
        busy onConfirm={onConfirm} onCancel={onCancel}
      />,
    );
    expect(within(screen.getByRole("dialog")).getByRole("textbox")).toHaveValue("SUPPRIMER");
  });
});
