import { describe, it, expect } from "vitest";
import {
  formatXOF,
  formatCurrency,
  generateMockTransactionId,
} from "../../utils/currency";

describe("formatXOF", () => {
  it("formate 5000 correctement", () => {
    expect(formatXOF(5000)).toBe("5\u202f000 FCFA");
  });

  it("formate 0", () => {
    expect(formatXOF(0)).toBe("0 FCFA");
  });

  it("formate un grand nombre", () => {
    expect(formatXOF(1500000)).toBe("1\u202f500\u202f000 FCFA");
  });

  it("contient toujours FCFA", () => {
    expect(formatXOF(100)).toContain("FCFA");
  });
});

describe("formatCurrency", () => {
  it("XOF utilise le format FCFA", () => {
    expect(formatCurrency(5000, "XOF")).toContain("FCFA");
  });

  it("USD contient le symbole dollar", () => {
    const result = formatCurrency(100, "USD");
    expect(result).toContain("$");
    expect(result).toContain("100");
  });

  it("EUR contient le symbole euro", () => {
    expect(formatCurrency(100, "EUR")).toContain("€");
  });
});

describe("generateMockTransactionId", () => {
  it("commence par mock_tx_", () => {
    expect(generateMockTransactionId()).toMatch(/^mock_tx_/);
  });

  it("génère des IDs uniques", () => {
    const ids = new Set(Array.from({ length: 10 }, generateMockTransactionId));
    expect(ids.size).toBe(10);
  });

  it("retourne une string non vide", () => {
    expect(generateMockTransactionId().length).toBeGreaterThan(0);
  });
});
