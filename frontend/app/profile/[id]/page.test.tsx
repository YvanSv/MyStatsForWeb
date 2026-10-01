import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";
import { API_ENDPOINTS } from "@/app/constants/routes";
import ServerProfilePage, { generateMetadata, generateViewport } from "./page";

vi.mock("./client", () => ({ default: () => null }));

const fetchMock = vi.fn();
const params = (id: string) => ({ params: Promise.resolve({ id }) }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const respond = (body: unknown) => fetchMock.mockResolvedValue({ ok: true, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateViewport", () => {
  it("définit la couleur de thème verte", async () => {
    expect(await generateViewport(params("a"))).toEqual({ themeColor: "#1DD05D" });
  });
});

describe("generateMetadata", () => {
  it("retourne un titre générique sans appel réseau quand l'id est vide", async () => {
    const meta = await generateMetadata(params(""));
    expect(meta).toEqual({ title: "Profil - MyStats" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("interroge l'API simple avec l'id et une revalidation d'une heure", async () => {
    respond({ display_name: "Yvan" });
    await generateMetadata(params("yvan"));
    expect(fetchMock).toHaveBeenCalledWith(`${API_ENDPOINTS.SIMPLE_PROFILE_DATA}/yvan`, { next: { revalidate: 3600 } });
  });

  it.each([
    ["a/b", "a%2Fb"],
    ["x?y=1", "x%3Fy%3D1"],
    ["../admin", "..%2Fadmin"],
  ])("encode l'identifiant %j dans l'URL appelée (%s) : il ne change pas la route", async (id, encoded) => {
    respond({ display_name: "Yvan" });
    const meta = await generateMetadata(params(id));
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_ENDPOINTS.SIMPLE_PROFILE_DATA}/${encoded}`);
    expect((meta.openGraph as { url: string }).url).toBe(`https://mystatsfy.vercel.app/profile/${encoded}`);
  });

  it("n'encode pas deux fois un identifiant déjà encodé", async () => {
    respond({ display_name: "Yvan" });
    await generateMetadata(params("caf%C3%A9"));
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_ENDPOINTS.SIMPLE_PROFILE_DATA}/caf%C3%A9`);
  });

  it("construit titre, description, OpenGraph et Twitter avec la bannière", async () => {
    respond({ display_name: "Yvan", bio: "Ma bio", banner: "b.jpg", avatar: "a.jpg" });
    const meta = await generateMetadata(params("yvan"));
    expect(meta.title).toBe("Profil de Yvan | MyStats");
    expect(meta.description).toBe("Ma bio");
    expect(meta.openGraph).toMatchObject({
      title: "Profil de Yvan | MyStats",
      url: "https://mystatsfy.vercel.app/profile/yvan",
      siteName: "MyStats",
      type: "profile",
      images: [{ url: "b.jpg", width: 1200, height: 630, alt: "Bannière de Yvan" }],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", images: ["b.jpg"] });
  });

  it("utilise l'avatar quand il n'y a pas de bannière", async () => {
    respond({ display_name: "Yvan", avatar: "a.jpg", banner: "" });
    const meta = await generateMetadata(params("1"));
    expect(meta.twitter?.images).toEqual(["a.jpg"]);
  });

  it("génère une description par défaut sans bio", async () => {
    respond({ display_name: "Yvan", bio: "" });
    const meta = await generateMetadata(params("1"));
    expect(meta.description).toBe("Découvrez les statistiques Spotify de Yvan.");
  });

  it.each([[null], [{}], [{ display_name: "" }]])("titre « introuvable » pour la réponse %j", async (body) => {
    respond(body);
    expect(await generateMetadata(params("zz"))).toEqual({ title: "Profil introuvable - MyStats" });
  });

  it("ne produit pas d'image OpenGraph avec une URL undefined quand ni bannière ni avatar", async () => {
    respond({ display_name: "Yvan" });
    const meta = await generateMetadata(params("1"));
    const images = (meta.openGraph?.images ?? []) as { url?: string }[];
    expect(images.every((i) => typeof i.url === "string")).toBe(true);
  });

  it("ne lève pas d'exception si le réseau échoue", async () => {
    fetchMock.mockRejectedValue(new Error("réseau"));
    await expect(generateMetadata(params("1"))).resolves.toEqual({ title: "Profil introuvable - MyStats" });
  });

  it("ne lève pas d'exception si la réponse n'est pas du JSON", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError("json"); } });
    await expect(generateMetadata(params("1"))).resolves.toEqual({ title: "Profil introuvable - MyStats" });
  });
});

describe("ServerProfilePage", () => {
  it("rend le composant client avec l'id résolu", async () => {
    const el = await ServerProfilePage(params("yvan"));
    expect(isValidElement(el)).toBe(true);
    expect((el as { props: { id: string } }).props.id).toBe("yvan");
  });
});
