import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateKeyEnvironment,
  logSandboxMode,
} from "../../utils/keyValidator";

describe("validateKeyEnvironment", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("avertit quand une clé live est utilisée en mode sandbox", () => {
    validateKeyEnvironment("pk_live_xxxx", true, "FedaPay");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("LIVE key")
    );
  });

  it("avertit quand une clé test est utilisée en mode production", () => {
    validateKeyEnvironment("pk_sandbox_xxxx", false, "FedaPay");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("TEST key")
    );
  });

  it("avertit pour une clé pk_test_ en mode production", () => {
    validateKeyEnvironment("pk_test_xxxx", false, "KKiaPay");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("TEST key")
    );
  });

  it("ne produit pas d'avertissement pour une clé live en production", () => {
    validateKeyEnvironment("pk_live_xxxx", false, "FedaPay");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("ne produit pas d'avertissement pour une clé sandbox en mode sandbox", () => {
    validateKeyEnvironment("pk_sandbox_xxxx", true, "FedaPay");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("ne fait rien si la clé est vide", () => {
    validateKeyEnvironment("", true, "FedaPay");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("inclut le nom du provider dans le message", () => {
    validateKeyEnvironment("pk_live_xxxx", true, "KKiaPay");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("KKiaPay")
    );
  });
});

describe("logSandboxMode", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logue quand sandbox est true", () => {
    logSandboxMode(true, "FedaPay");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Sandbox Mode")
    );
  });

  it("ne logue pas quand sandbox est false", () => {
    logSandboxMode(false, "FedaPay");
    expect(console.log).not.toHaveBeenCalled();
  });
});
