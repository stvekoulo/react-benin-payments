import { describe, it, expect, vi } from "vitest";
import { generateReceiptPdf, formatProviderName } from "../../utils/generateReceipt";
import type { ReceiptTransactionData } from "../../types/receipt";

const baseData: ReceiptTransactionData = {
  transactionId: "tx_123456789",
  amount: 5000,
  status: "Approuvé",
  customerName: "Jean Dupont",
  customerEmail: "jean@example.com",
};

describe("generateReceiptPdf", () => {
  describe("rendu par défaut (jsPDF)", () => {
    it("génère un Blob PDF non vide sans télécharger (autoDownload: false)", async () => {
      const result = await generateReceiptPdf(baseData, { autoDownload: false });

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.blob.type).toBe("application/pdf");
    });

    it("retourne un data URL base64 valide", async () => {
      const result = await generateReceiptPdf(baseData, { autoDownload: false });

      expect(result.dataUrl).toMatch(/^data:application\/pdf;.*base64,/);
    });

    it("dérive le nom de fichier depuis transactionId par défaut", async () => {
      const result = await generateReceiptPdf(baseData, { autoDownload: false });

      expect(result.filename).toBe("recu-tx_123456789");
    });

    it("respecte un filename personnalisé (chaîne ou fonction)", async () => {
      const asString = await generateReceiptPdf(baseData, {
        autoDownload: false,
        filename: "facture-perso",
      });
      expect(asString.filename).toBe("facture-perso");

      const asFn = await generateReceiptPdf(baseData, {
        autoDownload: false,
        filename: (data) => `cmd-${data.transactionId}`,
      });
      expect(asFn.filename).toBe("cmd-tx_123456789");
    });

    it("appelle onGenerated avec le blob et le data URL", async () => {
      const onGenerated = vi.fn();
      await generateReceiptPdf(baseData, { autoDownload: false, onGenerated });

      expect(onGenerated).toHaveBeenCalledTimes(1);
      expect(onGenerated).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^data:/));
    });
  });

  describe("renderPdf personnalisé", () => {
    it("utilise le blob retourné par renderPdf plutôt que jsPDF", async () => {
      const customBlob = new Blob(["contenu-personnalise"], { type: "application/pdf" });
      const renderPdf = vi.fn().mockResolvedValue({ blob: customBlob });

      const result = await generateReceiptPdf(baseData, { autoDownload: false, renderPdf });

      expect(renderPdf).toHaveBeenCalledWith(baseData, expect.objectContaining({ renderPdf }));
      expect(result.blob).toBe(customBlob);
    });

    it("utilise le filename retourné par renderPdf s'il est fourni", async () => {
      const renderPdf = vi.fn().mockReturnValue({
        blob: new Blob(["x"], { type: "application/pdf" }),
        filename: "mon-recu-maison",
      });

      const result = await generateReceiptPdf(baseData, { autoDownload: false, renderPdf });

      expect(result.filename).toBe("mon-recu-maison");
    });

    it("retombe sur resolveFilename si renderPdf ne fournit pas de filename", async () => {
      const renderPdf = vi.fn().mockReturnValue({
        blob: new Blob(["x"], { type: "application/pdf" }),
      });

      const result = await generateReceiptPdf(baseData, {
        autoDownload: false,
        filename: "nom-config",
        renderPdf,
      });

      expect(result.filename).toBe("nom-config");
    });

    it("calcule tout de même un data URL à partir du blob personnalisé", async () => {
      const renderPdf = vi.fn().mockReturnValue({
        blob: new Blob(["contenu"], { type: "application/pdf" }),
      });

      const result = await generateReceiptPdf(baseData, { autoDownload: false, renderPdf });

      expect(result.dataUrl).toMatch(/^data:/);
    });

    it("accepte un renderPdf synchrone (non async)", async () => {
      const renderPdf = () => ({ blob: new Blob(["sync"], { type: "application/pdf" }) });

      const result = await generateReceiptPdf(baseData, { autoDownload: false, renderPdf });

      expect(result.blob.size).toBeGreaterThan(0);
    });
  });

  describe("formatProviderName", () => {
    it("affiche les noms complets pour les deux providers intégrés", () => {
      expect(formatProviderName("fedapay")).toBe("FedaPay");
      expect(formatProviderName("kkiapay")).toBe("KKiaPay");
    });

    it("affiche l'identifiant tel quel pour un driver personnalisé", () => {
      expect(formatProviderName("cinetpay")).toBe("cinetpay");
    });
  });
});
