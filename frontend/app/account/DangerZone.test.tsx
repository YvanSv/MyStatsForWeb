import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerButton, DangerZone } from "./DangerZone";

describe("DangerZone", () => {
  it("déclenche l'action correspondante et affiche la note", async () => {
    const onClear = vi.fn(), onDelete = vi.fn();
    render(<DangerZone clearLabel="Nettoyer" deleteLabel="Supprimer" note="Attention" onClear={onClear} onDelete={onDelete}/>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Nettoyer" }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Attention")).toBeInTheDocument();
  });

  it("ajoute la classe supplémentaire du bouton", () => {
    render(<DangerButton onClick={() => {}} className=" pb-8">X</DangerButton>);
    expect(screen.getByRole("button")).toHaveClass("hover:opacity-80", "pb-8");
  });
});
