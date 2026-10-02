import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AvatarEditor, BannerEditor } from "./ProfileImages";

describe("ProfileImages", () => {
  it("la bannière affiche son libellé, son image et relaie le changement de fichier", () => {
    const onChange = vi.fn();
    const { container } = render(<BannerEditor src="data:image/png;base64,AAAA" alt="Bannière" label="Changer" onChange={onChange}/>);
    expect(screen.getByAltText("Bannière")).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(screen.getByText("Changer")).toBeInTheDocument();
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("un clic sur la bannière ouvre le sélecteur de fichier", () => {
    const { container } = render(<BannerEditor src="data:image/png;base64,AAAA" alt="B" label="Changer" onChange={() => {}}/>);
    const click = vi.spyOn(container.querySelector("input[type=file]") as HTMLInputElement, "click");
    fireEvent.click(screen.getByText("Changer"));
    expect(click).toHaveBeenCalled();
  });

  it("l'avatar accepte uniquement les images autorisées et ouvre le sélecteur au clic", () => {
    const { container } = render(<AvatarEditor src="/a.png" alt="Avatar" onChange={() => {}}/>);
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    expect(input.accept).toBe("image/png,image/jpeg,image/webp,image/gif");
    const click = vi.spyOn(input, "click");
    fireEvent.click(container.querySelector("svg")!.parentElement!);
    expect(click).toHaveBeenCalled();
  });
});
