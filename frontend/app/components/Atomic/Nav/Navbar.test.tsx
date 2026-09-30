import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderLogo, MenuButton, MenuButtonDanger, NavButton, PopoverMenu } from "./Navbar";

vi.mock("next/image", () => ({
  // `priority` est une prop next/image qui n'existe pas sur <img>
  default: ({ priority, alt, ...props }: { priority?: boolean; alt?: string } & Record<string, unknown>) => {
    void priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ""} {...props} />;
  },
}));

describe("HeaderLogo", () => {
  it("affiche le logo et le nom MyStats", () => {
    render(<HeaderLogo />);
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "/logo.png");
    expect(screen.getByText("MyStats")).toBeInTheDocument();
  });

  it("appelle onClick au clic", async () => {
    const onClick = vi.fn();
    render(<HeaderLogo onClick={onClick} />);
    await userEvent.setup().click(screen.getByText("MyStats"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ne plante pas au clic sans onClick", async () => {
    render(<HeaderLogo />);
    await userEvent.setup().click(screen.getByText("MyStats"));
    expect(screen.getByText("MyStats")).toBeInTheDocument();
  });
});

describe("NavButton", () => {
  it("affiche ses enfants et appelle onClick", async () => {
    const onClick = vi.fn();
    render(<NavButton onClick={onClick}>Stats</NavButton>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Stats" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("PopoverMenu", () => {
  it("affiche son contenu, masqué par défaut et visible au survol du groupe", () => {
    render(<PopoverMenu additional="w-40"><span>Entrée</span></PopoverMenu>);
    const popover = screen.getByText("Entrée").parentElement!;
    expect(popover).toHaveClass("opacity-0", "invisible", "group-hover:visible", "w-40");
  });
});

describe.each([
  ["MenuButton", MenuButton, "hover:text-vert"],
  ["MenuButtonDanger", MenuButtonDanger, "text-red-400"],
])("%s", (_name, Comp, colorClass) => {
  it("affiche ses enfants et appelle onClick", async () => {
    const onClick = vi.fn();
    render(<Comp onClick={onClick}>Action</Comp>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Action" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("utilise label comme nom accessible (bouton icône)", () => {
    render(<Comp label="Grille"><svg /></Comp>);
    expect(screen.getByRole("button", { name: "Grille" })).toBeInTheDocument();
  });

  it("n'ajoute pas d'aria-label sans label", () => {
    render(<Comp>Action</Comp>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-label");
  });

  it("applique son style et les classes additionnelles", () => {
    render(<Comp additional="mt-2">Action</Comp>);
    expect(screen.getByRole("button")).toHaveClass(colorClass, "mt-2", "w-full");
  });
});
