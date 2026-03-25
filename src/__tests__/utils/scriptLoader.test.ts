import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadScript } from "../../utils/scriptLoader";

describe("loadScript", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("résout true quand le script se charge avec succès", async () => {
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      setTimeout(() => script.onload?.(new Event("load")), 0);
      return node;
    });

    const result = await loadScript(
      "https://cdn.example.com/test.js",
      "test-script-ok"
    );
    expect(result).toBe(true);
  });

  it("résout true immédiatement si le script existe déjà dans le DOM", async () => {
    const existing = document.createElement("script");
    existing.id = "already-loaded";
    document.body.appendChild(existing);

    const result = await loadScript(
      "https://cdn.example.com/test.js",
      "already-loaded"
    );
    expect(result).toBe(true);
  });

  it("rejette si le script échoue à se charger", async () => {
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      setTimeout(() => script.onerror?.(new Event("error")), 0);
      return node;
    });

    await expect(
      loadScript("https://cdn.example.com/fail.js", "fail-script")
    ).rejects.toThrow("Failed to load script");
  });

  it("le message d'erreur contient l'URL du script", async () => {
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      setTimeout(() => script.onerror?.(new Event("error")), 0);
      return node;
    });

    await expect(
      loadScript("https://cdn.example.com/fail.js", "fail-script-url")
    ).rejects.toThrow("https://cdn.example.com/fail.js");
  });

  it("retourne false dans un environnement SSR (sans document)", async () => {
    const originalDocument = global.document;
    // @ts-expect-error — simule un contexte SSR sans DOM
    global.document = undefined;

    try {
      const result = await loadScript("https://cdn.example.com/test.js", "ssr-test");
      expect(result).toBe(false);
    } finally {
      global.document = originalDocument;
    }
  });

  it("n'ajoute pas de script en double si appelé deux fois avec le même id", async () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const existing = document.createElement("script");
    existing.id = "dedup-script";
    document.body.appendChild(existing);

    const callCountBefore = appendSpy.mock.calls.length;
    await loadScript("https://cdn.example.com/test.js", "dedup-script");

    expect(appendSpy.mock.calls.length).toBe(callCountBefore);
  });
});
