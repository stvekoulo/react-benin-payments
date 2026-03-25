import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyTransaction } from "../../utils/verifyTransaction";

const defaultPayload = {
  transactionId: "tx_123",
  amount: 5000,
  provider: "fedapay" as const,
};

describe("verifyTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lève une erreur si verifyUrl est manquant", async () => {
    await expect(verifyTransaction({}, defaultPayload)).rejects.toThrow(
      "verifyUrl is required"
    );
  });

  it("envoie une requête POST par défaut", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await verifyTransaction({ verifyUrl: "/api/verify" }, defaultPayload);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/verify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("envoie une requête GET avec les params en query string", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await verifyTransaction(
      { verifyUrl: "/api/verify", verifyMethod: "GET" },
      defaultPayload
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("transactionId=tx_123");
    expect(calledUrl).toContain("amount=5000");
    expect(calledUrl).toContain("provider=fedapay");
  });

  it("n'envoie pas de body en mode GET", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await verifyTransaction(
      { verifyUrl: "/api/verify", verifyMethod: "GET" },
      defaultPayload
    );

    const options = mockFetch.mock.calls[0][1] as RequestInit;
    expect(options.body).toBeUndefined();
  });

  it("lève une erreur si la réponse HTTP n'est pas ok", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Transaction introuvable" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      verifyTransaction({ verifyUrl: "/api/verify" }, defaultPayload)
    ).rejects.toThrow("Transaction introuvable");
  });

  it("utilise le status HTTP dans le message si pas de message JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      verifyTransaction({ verifyUrl: "/api/verify" }, defaultPayload)
    ).rejects.toThrow("500");
  });

  it("inclut les headers personnalisés dans la requête", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await verifyTransaction(
      {
        verifyUrl: "/api/verify",
        customVerifyHeaders: { Authorization: "Bearer token123" },
      },
      defaultPayload
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/verify",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token123",
        }),
      })
    );
  });

  it("retourne success=true depuis la réponse backend", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, message: "OK" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyTransaction(
      { verifyUrl: "/api/verify" },
      defaultPayload
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("OK");
  });

  it("fonctionne avec le provider kkiapay", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await verifyTransaction({ verifyUrl: "/api/verify" }, {
      ...defaultPayload,
      provider: "kkiapay",
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as RequestInit).body as string
    );
    expect(body.provider).toBe("kkiapay");
  });
});
