import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, setUnauthorizedHandler } from "./api";

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

describe("apiRequest – corps de requête non JSON", () => {
  it("laisse un URLSearchParams intact (pas de « {} »)", async () => {
    const body = new URLSearchParams({ a: "1" });
    await apiRequest("http://api/test", { method: "POST", body });
    expect(sentInit().body).toBe(body);
    expect(sentInit().headers.has("Content-Type")).toBe(false);
  });

  it("laisse un Blob et un ArrayBuffer intacts", async () => {
    const blob = new Blob(["x"]);
    await apiRequest("http://api/test", { method: "POST", body: blob });
    expect(sentInit().body).toBe(blob);
    fetchMock.mockClear();
    const buffer = new ArrayBuffer(4);
    await apiRequest("http://api/test", { method: "POST", body: buffer });
    expect(sentInit().body).toBe(buffer);
  });

  it("sérialise un tableau en JSON", async () => {
    await apiRequest("http://api/test", { method: "POST", body: [1, 2] as unknown as BodyInit });
    expect(sentInit().body).toBe("[1,2]");
    expect(sentInit().headers.get("Content-Type")).toBe("application/json");
  });

  it("sérialise un objet sans prototype", async () => {
    const body = Object.assign(Object.create(null), { a: 1 });
    await apiRequest("http://api/test", { method: "POST", body });
    expect(sentInit().body).toBe('{"a":1}');
  });

  it("garde le Content-Type fourni pour un corps objet", async () => {
    await apiRequest("http://api/test", {
      method: "POST",
      body: { a: 1 } as unknown as BodyInit,
      headers: { "Content-Type": "application/vnd.api+json" },
    });
    expect(sentInit().headers.get("Content-Type")).toBe("application/vnd.api+json");
  });

  it("accepte des en-têtes fournis sous forme de Headers ou de tableau", async () => {
    await apiRequest("http://api/test", { headers: new Headers({ "X-A": "1" }) });
    expect(sentInit().headers.get("X-A")).toBe("1");
    fetchMock.mockClear();
    await apiRequest("http://api/test", { headers: [["X-B", "2"]] });
    expect(sentInit().headers.get("X-B")).toBe("2");
  });

  it("transmet le signal d'annulation à fetch", async () => {
    const controller = new AbortController();
    await apiRequest("http://api/test", { signal: controller.signal });
    expect(sentInit().signal).toBe(controller.signal);
  });

  it("impose credentials: include même si l'appelant demande autre chose", async () => {
    await apiRequest("http://api/test", { credentials: "omit" });
    expect(sentInit().credentials).toBe("include");
  });
});

describe("apiRequest – réponses particulières", () => {
  it("renvoie null pour une réponse 204 sans contenu (sans lire le JSON)", async () => {
    const json = vi.fn().mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));
    fetchMock.mockResolvedValue({ ok: true, status: 204, json } as unknown as Response);
    await expect(apiRequest("http://api/test", { method: "DELETE" })).resolves.toBeNull();
    expect(json).not.toHaveBeenCalled();
  });

  it("propage l'erreur d'analyse quand une réponse 200 n'est pas du JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("pas du json")),
    } as unknown as Response);
    await expect(apiRequest("http://api/test")).rejects.toThrow("pas du json");
  });

  it.each([400, 403, 404, 409, 422, 429, 500, 503])("transforme le statut %i en ApiError", async (status) => {
    fetchMock.mockResolvedValue(errResponse(status, () => Promise.resolve({ detail: "x" })));
    const err = await apiRequest("http://api/test").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(status);
  });

  it("garde le code générique quand l'erreur est une liste de validation 422", async () => {
    const detail = [{ loc: ["body", "email"], msg: "invalide" }];
    fetchMock.mockResolvedValue(errResponse(422, () => Promise.resolve({ detail })));
    const err = await apiRequest("http://api/test").catch((e) => e);
    expect(err.message).toBe("API_ERROR");
    expect(err.detail).toEqual({ detail });
  });

  it("n'appelle fetch qu'une seule fois (pas de nouvelle tentative)", async () => {
    fetchMock.mockResolvedValue(errResponse(500, () => Promise.resolve({})));
    await apiRequest("http://api/test").catch(() => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("apiRequest – gestion globale du 401", () => {
  const handler = vi.fn();
  let unsubscribe: () => void;

  beforeEach(() => {
    handler.mockReset();
    unsubscribe = setUnauthorizedHandler(handler);
  });
  afterEach(() => unsubscribe());

  it("appelle le gestionnaire une fois, avec l'URL demandée, sur une réponse 401", async () => {
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({ detail: "Non connecté" })));
    await apiRequest("http://api/data").catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("http://api/data");
  });

  it("lève quand même l'ApiError 401 à l'appelant", async () => {
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({ detail: "Non connecté" })));
    const err = await apiRequest("http://api/data").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Non connecté");
  });

  it("appelle le gestionnaire avant de lever l'erreur", async () => {
    const order: string[] = [];
    handler.mockImplementation(() => order.push("handler"));
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({})));
    await apiRequest("http://api/data").catch(() => order.push("catch"));
    expect(order).toEqual(["handler", "catch"]);
  });

  it.each([400, 403, 404, 422, 500, 503])("n'appelle pas le gestionnaire pour le statut %i", async (status) => {
    fetchMock.mockResolvedValue(errResponse(status, () => Promise.resolve({})));
    await apiRequest("http://api/data").catch(() => {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("n'appelle pas le gestionnaire pour une réponse réussie", async () => {
    await apiRequest("http://api/data");
    expect(handler).not.toHaveBeenCalled();
  });

  it("appelle le gestionnaire même quand le corps de l'erreur n'est pas du JSON", async () => {
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.reject(new SyntaxError("x")), "Unauthorized"));
    const err = await apiRequest("http://api/data").catch((e) => e);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(err.message).toBe("Unauthorized");
  });

  it("un gestionnaire qui plante ne masque pas l'erreur d'origine", async () => {
    handler.mockImplementation(() => { throw new Error("boom du gestionnaire"); });
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({ detail: "Non connecté" })));
    const err = await apiRequest("http://api/data").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Non connecté");
  });

  it("le remplacement d'un gestionnaire retire l'ancien", async () => {
    const second = vi.fn();
    const off = setUnauthorizedHandler(second);
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({})));
    await apiRequest("http://api/data").catch(() => {});
    expect(second).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
    off();
  });

  it("la fonction de retrait désactive le gestionnaire", async () => {
    unsubscribe();
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({})));
    await apiRequest("http://api/data").catch(() => {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("l'ancien retrait ne supprime pas un gestionnaire plus récent", async () => {
    const second = vi.fn();
    const off = setUnauthorizedHandler(second);
    unsubscribe(); // retrait du premier, déjà remplacé
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({})));
    await apiRequest("http://api/data").catch(() => {});
    expect(second).toHaveBeenCalledTimes(1);
    off();
  });

  it("sans gestionnaire enregistré, une 401 lève simplement l'ApiError", async () => {
    unsubscribe();
    fetchMock.mockResolvedValue(errResponse(401, () => Promise.resolve({ detail: "x" })));
    await expect(apiRequest("http://api/data")).rejects.toBeInstanceOf(ApiError);
  });
});
