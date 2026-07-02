import { describe, it, expect } from "vitest";
import { validatePublicKeyAndAmount } from "../../core/validateCommonConfig";

describe("validatePublicKeyAndAmount", () => {
  it("retourne MISSING_PUBLIC_KEY si la clé est absente hors mode mock", () => {
    expect(validatePublicKeyAndAmount(undefined, 5000, false)).toEqual(
      expect.objectContaining({ code: "MISSING_PUBLIC_KEY" })
    );
    expect(validatePublicKeyAndAmount("  ", 5000, false)).toEqual(
      expect.objectContaining({ code: "MISSING_PUBLIC_KEY" })
    );
  });

  it("ignore la clé manquante en mode mock", () => {
    expect(validatePublicKeyAndAmount(undefined, 5000, true)).toBeNull();
  });

  it("retourne INVALID_AMOUNT si le montant est 0 ou négatif", () => {
    expect(validatePublicKeyAndAmount("pk_live_x", 0, false)).toEqual(
      expect.objectContaining({ code: "INVALID_AMOUNT" })
    );
    expect(validatePublicKeyAndAmount("pk_live_x", -100, true)).toEqual(
      expect.objectContaining({ code: "INVALID_AMOUNT" })
    );
  });

  it("retourne null si la clé et le montant sont valides", () => {
    expect(validatePublicKeyAndAmount("pk_live_x", 5000, false)).toBeNull();
  });
});
