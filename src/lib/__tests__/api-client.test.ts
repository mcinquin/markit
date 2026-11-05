import { apiRequest } from "@/lib/api-client";

const fetchMock = jest.fn();

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  it("renvoie les données en cas de succès", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "t1" }));
    expect(await apiRequest("/api/x")).toEqual({ ok: true, data: { id: "t1" } });
  });

  it("sérialise le corps JSON et ajoute l'en-tête", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await apiRequest("/api/x", { method: "POST", json: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledWith("/api/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"a":1}',
    });
  });

  it("remonte le message d'erreur de l'API", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Code invalide" }, 404));
    expect(await apiRequest("/api/x")).toEqual({ ok: false, error: "Code invalide", status: 404 });
  });

  it("utilise le message de repli si la réponse n'est pas du JSON", async () => {
    fetchMock.mockResolvedValue(new Response("Bad Gateway", { status: 502 }));
    expect(await apiRequest("/api/x", { fallbackError: "Oups" })).toEqual({
      ok: false,
      error: "Oups",
      status: 502,
    });
  });

  it("gère les erreurs réseau sans lever", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await apiRequest("/api/x");
    expect(result).toMatchObject({ ok: false, status: 0 });
  });
});
