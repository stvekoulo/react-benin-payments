import { describe, it, expect, vi } from "vitest";

// Simulates jsPDF not being installed (it's an optional peer dependency).
// Isolated in its own file so it doesn't affect the other generateReceipt
// tests, which rely on the real jsPDF package.
vi.mock("jspdf", () => {
  throw new Error("Cannot find module 'jspdf'");
});

describe("generateReceiptPdf sans jsPDF installé", () => {
  it("lève une erreur explicite orientant vers l'installation ou renderPdf", async () => {
    const { generateReceiptPdf } = await import("../../utils/generateReceipt");

    await expect(
      generateReceiptPdf(
        { transactionId: "tx_1", amount: 1000 },
        { autoDownload: false }
      )
    ).rejects.toThrow(/npm install jspdf/);
  });

  it("n'est pas affectée quand renderPdf est fourni (jsPDF jamais chargé)", async () => {
    const { generateReceiptPdf } = await import("../../utils/generateReceipt");
    const blob = new Blob(["ok"], { type: "application/pdf" });

    const result = await generateReceiptPdf(
      { transactionId: "tx_1", amount: 1000 },
      { autoDownload: false, renderPdf: () => ({ blob }) }
    );

    expect(result.blob).toBe(blob);
  });
});
