import { describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFocusTrap } from "./useFocusTrap";

function Demo({ open, onEscape }: { open: boolean, onEscape?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onEscape);
  return (
    <>
      <button>dehors</button>
      {open && <div ref={ref} role="dialog"><button>un</button><button>deux</button></div>}
    </>
  );
}

describe("useFocusTrap", () => {
  it("focus le premier élément à l'ouverture et rend le focus à la fermeture", () => {
    const { rerender } = render(<Demo open={false} />);
    screen.getByText("dehors").focus();
    rerender(<Demo open />);
    expect(screen.getByText("un")).toHaveFocus();
    rerender(<Demo open={false} />);
    expect(screen.getByText("dehors")).toHaveFocus();
  });

  it("Tab et Maj+Tab bouclent dans le conteneur", async () => {
    const user = userEvent.setup();
    render(<Demo open />);
    await user.tab();
    expect(screen.getByText("deux")).toHaveFocus();
    await user.tab();
    expect(screen.getByText("un")).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText("deux")).toHaveFocus();
  });

  it("Échap appelle onEscape", async () => {
    const onEscape = vi.fn();
    render(<Demo open onEscape={onEscape} />);
    await userEvent.setup().keyboard("{Escape}");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("inactif : ne touche pas au focus ni aux touches", async () => {
    const onEscape = vi.fn();
    render(<Demo open={false} onEscape={onEscape} />);
    await userEvent.setup().keyboard("{Escape}");
    expect(onEscape).not.toHaveBeenCalled();
  });
});
