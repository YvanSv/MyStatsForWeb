import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./api";

// --- ApiError --------------------------------------------------------------

describe("ApiError – message", () => {
  it("est une Error", () => {
    const err = new ApiError(500, "boom");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("conserve le statut et le détail bruts", () => {
    const detail = { detail: "Non connecté" };
    const err = new ApiError(401, detail);
    expect(err.status).toBe(401);
    expect(err.detail).toBe(detail);
  });

  it("utilise le détail comme message quand c'est une chaîne", () => {
    expect(new ApiError(400, "Mauvaise requête").message).toBe("Mauvaise requête");
  });

  it("extrait le message des HTTPException FastAPI ({ detail: '…' })", () => {
    expect(new ApiError(401, { detail: "Email ou mot de passe incorrect" }).message).toBe("Email ou mot de passe incorrect");
  });

  it.each([
    ["une liste de validation 422", { detail: [{ loc: ["body", "email"], msg: "invalide" }] }],
    ["un objet sans detail", { foo: "bar" }],
    ["un detail vide", { detail: "" }],
    ["une chaîne vide", ""],
    ["null", null],
    ["undefined", undefined],
    ["un nombre", 42],
  ])("garde le code générique API_ERROR pour %s", (_label, detail) => {
    expect(new ApiError(500, detail).message).toBe("API_ERROR");
  });
});

// --- apiRequest ------------------------------------------------------------

const okResponse = (body: unknown = {}) => ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as Response;
const errResponse = (status: number, json: () => Promise<unknown>, statusText = "") =>
  ({ ok: false, status, statusText, json }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const sentInit = () => fetchMock.mock.calls[0][1] as RequestInit & { headers: Headers };

describe("apiRequest – requête", () => {
  it("appelle l'URL demandée", async () => {
    await apiRequest("http://api/test");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api/test");
  });

  it("envoie toujours les cookies (credentials: include)", async () => {
    await apiRequest("http://api/test");
    expect(sentInit().credentials).toBe("include");
  });

  it("ne force aucun Content-Type sans corps", async () => {
    await apiRequest("http://api/test");
    expect(sentInit().headers.has("Content-Type")).toBe(false);
  });

  it("ajoute Content-Type: application/json quand le corps est une chaîne", async () => {
    await apiRequest("http://api/test", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(sentInit().headers.get("Content-Type")).toBe("application/json");
    expect(sentInit().body).toBe('{"a":1}');
  });

  it("sérialise un corps objet en JSON", async () => {
    await apiRequest("http://api/test", { method: "POST", body: { a: 1 } as unknown as BodyInit });
    expect(sentInit().body).toBe('{"a":1}');
    expect(sentInit().headers.get("Content-Type")).toBe("application/json");
  });

  it("n'écrase pas un Content-Type déjà fourni", async () => {
    await apiRequest("http://api/test", {
      method: "POST",
      body: "x",
      headers: { "Content-Type": "text/plain" },
    });
    expect(sentInit().headers.get("Content-Type")).toBe("text/plain");
  });

  it("laisse un FormData intact, sans Content-Type (le navigateur ajoute la frontière)", async () => {
    const form = new FormData();
    form.append("files", new Blob(["a"]), "a.json");
    await apiRequest("http://api/test", { method: "POST", body: form });
    expect(sentInit().body).toBe(form);
    expect(sentInit().headers.has("Content-Type")).toBe(false);
  });

  it("conserve la méthode et les en-têtes personnalisés", async () => {
    await apiRequest("http://api/test", { method: "PATCH", headers: { "X-Test": "1" } });
    expect(sentInit().method).toBe("PATCH");
    expect(sentInit().headers.get("X-Test")).toBe("1");
  });
});

describe("apiRequest – réponse", () => {
  it("renvoie le JSON de la réponse", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: 1 }));
    await expect(apiRequest("http://api/test")).resolves.toEqual({ id: 1 });
  });

  it("lève une ApiError avec le statut et le détail JSON quand la réponse est en erreur", async () => {
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({ detail: "Non connecté" })));
    const err = await apiRequest("http://api/test").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.detail).toEqual({ detail: "Non connecté" });
    expect(err.message).toBe("Non connecté");
  });

  it("utilise le statusText quand le corps d'erreur n'est pas du JSON", async () => {
    fetchMock.mockResolvedValue(errResponse(502, () => Promise.reject(new SyntaxError("pas du json")), "Bad Gateway"));
    const err = await apiRequest("http://api/test").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.detail).toBe("Bad Gateway");
    expect(err.message).toBe("Bad Gateway");
  });

  it("laisse passer l'erreur réseau telle quelle (fetch qui échoue)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiRequest("http://api/test")).rejects.toThrow("Failed to fetch");
  });
});
