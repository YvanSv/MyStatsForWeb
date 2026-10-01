/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({
  jostCalls: [] as any[],
  provider: (name: string) => ({ children }: { children: any }) => ({
    type: "div", props: { "data-testid": name, children }, key: null, ref: null, $$typeof: Symbol.for("react.transitional.element"),
  }),
}));

vi.mock("next/font/google", () => ({
  Jost: (opts: any) => { h.jostCalls.push(opts); return { variable: "jost-var-class", className: "jost-class" }; },
}));
vi.mock("./globals.css", () => ({}));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => <div data-testid="speed" /> }));
vi.mock("react-hot-toast", () => ({
  Toaster: (p: any) => <div data-testid="toaster" data-position={p.position} data-reverse={String(p.reverseOrder)} />,
}));
vi.mock("./components/Header", () => ({ default: () => <header data-testid="header" /> }));
vi.mock("./components/Footer", () => ({ default: () => <footer data-testid="footer" /> }));

vi.mock("./context/languageContext", () => ({ LanguageProvider: h.provider("language") }));
vi.mock("./context/viewModeContext", () => ({ ViewModeProvider: h.provider("viewmode") }));
vi.mock("./context/showFiltersContext", () => ({ ShowFiltersProvider: h.provider("filters") }));
vi.mock("./context/authContext", () => ({ AuthProvider: h.provider("auth") }));
vi.mock("./context/currentlyPlayingContext", () => ({ SpotifyProvider: h.provider("spotify") }));

import RootLayout, { metadata } from "./layout";

const Child = () => <p data-testid="child">contenu</p>;

/** Élément retourné par RootLayout (<html>), pour inspecter la structure sans rendre <html> dans RTL. */
const tree = () => RootLayout({ children: <Child /> }) as React.ReactElement<any>;
const body = () => React.Children.only(tree().props.children) as React.ReactElement<any>;

/** Rend uniquement l'intérieur de <body>. */
const renderBody = (children: React.ReactNode = <Child />) => {
  const el = RootLayout({ children }) as React.ReactElement<any>;
  const bodyEl = React.Children.only(el.props.children) as React.ReactElement<any>;
  return render(<>{bodyEl.props.children}</>);
};

describe("metadata", () => {
  it("définit titre et description", () => {
    expect(metadata.title).toBe("MyStats - Votre musique, décryptée.");
    expect(metadata.description).toBe("Découvrez vos statistiques Spotify ! Venez analyser vos habitudes d'écoute.");
  });

  it("openGraph reprend titre et description de la page", () => {
    expect(metadata.openGraph.title).toBe(metadata.title);
    expect(metadata.openGraph.description).toBe(metadata.description);
    expect(metadata.openGraph.url).toBe("https://mystatsfy.vercel.app/");
    expect(metadata.openGraph.siteName).toBe("MyStats");
    expect(metadata.openGraph.type).toBe("website");
  });

  it("twitter utilise la grande carte", () => {
    expect(metadata.twitter).toEqual({ card: "summary_large_image" });
  });

  it("l'URL openGraph est absolue en https", () => {
    expect(() => new URL(metadata.openGraph.url)).not.toThrow();
    expect(new URL(metadata.openGraph.url).protocol).toBe("https:");
  });
});

describe("Jost", () => {
  it("est configurée une fois avec le subset latin, les graisses et la variable CSS", () => {
    expect(h.jostCalls).toHaveLength(1);
    expect(h.jostCalls[0]).toEqual({
      subsets: ["latin"],
      weight: ["400", "600", "700", "900"],
      variable: "--font-jost",
    });
  });
});

describe("RootLayout - structure retournée", () => {
  it("retourne un élément html avec lang='fr'", () => {
    const el = tree();
    expect(el.type).toBe("html");
    expect(el.props.lang).toBe("fr");
  });

  it("html contient un unique body", () => {
    expect(body().type).toBe("body");
  });

  it("imbrique les providers dans l'ordre Language > ViewMode > Filters > Auth > Spotify", () => {
    const names: string[] = [];
    let node: any = body().props.children;
    // Chaque provider est un composant mocké ; on descend via son unique enfant.
    for (let i = 0; i < 5; i++) {
      const out = (node.type as any)({ children: node.props.children });
      names.push(out.props["data-testid"]);
      node = React.Children.toArray(node.props.children)[0];
      if (i === 4) break;
    }
    expect(names).toEqual(["language", "viewmode", "filters", "auth", "spotify"]);
  });

  it("n'est pas un composant client : ne dépend d'aucun hook (appel direct possible)", () => {
    expect(() => RootLayout({ children: null })).not.toThrow();
  });

  it("accepte des children nuls", () => {
    expect(() => renderBody(null)).not.toThrow();
  });
});

describe("RootLayout - rendu de l'intérieur du body", () => {
  it("rend les providers imbriqués dans le bon ordre", () => {
    renderBody();
    const chain = ["language", "viewmode", "filters", "auth", "spotify"];
    for (let i = 0; i < chain.length - 1; i++) {
      expect(screen.getByTestId(chain[i]).firstElementChild).toBe(screen.getByTestId(chain[i + 1]));
    }
  });

  it("place Header, children et Footer dans le conteneur de police, dans cet ordre", () => {
    renderBody();
    const spotify = screen.getByTestId("spotify");
    const wrapper = spotify.firstElementChild!;
    expect(wrapper.className).toContain("jost-var-class");
    expect(wrapper.className).toContain("app-shell");
    expect(wrapper.className).not.toContain("h-screen");
    expect(wrapper.firstElementChild).toBe(screen.getByTestId("header"));
    const pos = (a: Node, b: Node) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(pos(screen.getByTestId("header"), screen.getByTestId("child"))).toBeTruthy();
    expect(pos(screen.getByTestId("child"), screen.getByTestId("footer"))).toBeTruthy();
  });

  it("rend children dans un conteneur sans landmark main (chaque page fournit le sien)", () => {
    renderBody();
    expect(screen.getByTestId("child").closest("main")).toBeNull();
  });

  it("n'imbrique pas de main dans un autre main (HTML valide)", () => {
    const { container } = renderBody(<main data-testid="page-main">page</main>);
    expect(container.querySelectorAll("main main")).toHaveLength(0);
  });

  it("le footer est hors du main", () => {
    renderBody();
    expect(screen.getByTestId("footer").closest("main")).toBeNull();
  });

  it("rend Toaster en bas à droite sans ordre inversé", () => {
    renderBody();
    const t = screen.getByTestId("toaster");
    expect(t.dataset.position).toBe("bottom-right");
    expect(t.dataset.reverse).toBe("false");
  });

  it("Toaster et SpeedInsights sont dans SpotifyProvider mais hors du conteneur de mise en page", () => {
    renderBody();
    const spotify = screen.getByTestId("spotify");
    expect(screen.getByTestId("toaster").parentElement).toBe(spotify);
    expect(screen.getByTestId("speed").parentElement).toBe(spotify);
  });

  it("rend SpeedInsights une seule fois", () => {
    renderBody();
    expect(screen.getAllByTestId("speed")).toHaveLength(1);
  });

  it("fournit une zone de défilement pour le contenu", () => {
    renderBody();
    const scroller = screen.getByTestId("child").closest(".overflow-y-auto");
    expect(scroller).toBeInTheDocument();
    expect(scroller).toContainElement(screen.getByTestId("footer"));
    expect(scroller).not.toContainElement(screen.getByTestId("header"));
  });
});
