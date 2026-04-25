"use client";

import { useCallback, useState } from "react";
import { generateReceiptPdf, type GenerateReceiptResult } from "../utils/generateReceipt";
import { sendReceiptEmail } from "../utils/sendReceiptEmail";
import type { ReceiptConfig, ReceiptTransactionData } from "../types/receipt";

export type { ReceiptConfig, ReceiptTransactionData } from "../types/receipt";
export type {
  ReceiptField,
  ReceiptLabels,
  ReceiptEmailConfig,
  ReceiptEmailParams,
} from "../types/receipt";
export type { GenerateReceiptResult } from "../utils/generateReceipt";

/**
 * Valeur retournée par `usePaymentReceipt`.
 */
export interface UsePaymentReceiptReturn {
  /**
   * Génère le PDF et déclenche le téléchargement dans le navigateur.
   * Respecte `config.autoDownload` (défaut : `true`).
   *
   * @returns Blob, data URL et nom de fichier — ou `null` en cas d'erreur
   */
  generateAndDownload: (
    data: ReceiptTransactionData
  ) => Promise<GenerateReceiptResult | null>;

  /**
   * Génère le PDF sans téléchargement et retourne le Blob.
   * Utile pour l'afficher dans un `<iframe>` ou l'uploader.
   *
   * @returns Blob — ou `null` en cas d'erreur
   */
  generateBlob: (data: ReceiptTransactionData) => Promise<Blob | null>;

  /**
   * Génère le PDF et retourne le data URL base64.
   * Utile pour prévisualiser le PDF dans le navigateur.
   *
   * @returns Data URL `"data:application/pdf;base64,..."` — ou `null` en cas d'erreur
   */
  generateDataUrl: (data: ReceiptTransactionData) => Promise<string | null>;

  /**
   * Génère le reçu et l'envoie par email à l'adresse indiquée.
   * Nécessite que `config.email` soit configuré.
   *
   * @param to   Adresse email du destinataire
   * @param data Données de la transaction
   * @throws si `config.email` est absent ou si l'envoi échoue
   */
  sendByEmail: (to: string, data: ReceiptTransactionData) => Promise<void>;

  /** `true` pendant la génération du PDF */
  isGenerating: boolean;

  /** `true` pendant l'envoi de l'email */
  isSending: boolean;

  /** Dernière erreur survenue, ou `null` */
  error: Error | null;

  /** Efface l'erreur courante */
  clearError: () => void;
}

/**
 * Hook React pour générer des reçus PDF et les envoyer par email.
 *
 * Toute la mise en page est contrôlée via le paramètre `config` :
 * logo, couleurs, numérotation des factures, champs personnalisés, pied de page.
 *
 * @example
 * ```tsx
 * // Génération + téléchargement automatique
 * const { generateAndDownload, isGenerating } = usePaymentReceipt({
 *   appName: "MonShop",
 *   logo: "/logo.png",
 *   primaryColor: "#22C55E",
 *   invoicePrefix: "CMD-",
 *   footerNote: "Merci pour votre achat !",
 * });
 *
 * // Dans le callback onComplete de useFedaPay :
 * onComplete: (response) => {
 *   generateAndDownload({
 *     transactionId: response.transaction.reference,
 *     amount: response.transaction.amount,
 *     status: "Approuvé",
 *     customerName: "Jean Dupont",
 *     customerEmail: "jean@example.com",
 *   });
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Envoi automatique par email
 * const { sendByEmail } = usePaymentReceipt({
 *   appName: "MonShop",
 *   email: {
 *     sendFn: async ({ to, pdfBase64, filename }) => {
 *       await fetch("/api/send-receipt", {
 *         method: "POST",
 *         body: JSON.stringify({ to, pdfBase64, filename }),
 *       });
 *     },
 *   },
 * });
 *
 * sendByEmail("client@example.com", transactionData);
 * ```
 */
export function usePaymentReceipt(
  config: ReceiptConfig = {}
): UsePaymentReceiptReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Génère + télécharge
  const generateAndDownload = useCallback(
    async (data: ReceiptTransactionData): Promise<GenerateReceiptResult | null> => {
      setIsGenerating(true);
      setError(null);
      try {
        return await generateReceiptPdf(data, { ...config, autoDownload: true });
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error("Échec de la génération du reçu");
        setError(e);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(config)]
  );

  // Génère → Blob uniquement (pas de téléchargement)
  const generateBlob = useCallback(
    async (data: ReceiptTransactionData): Promise<Blob | null> => {
      setIsGenerating(true);
      setError(null);
      try {
        const result = await generateReceiptPdf(data, {
          ...config,
          autoDownload: false,
        });
        return result.blob;
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error("Échec de la génération du reçu");
        setError(e);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(config)]
  );

  // Génère → data URL uniquement
  const generateDataUrl = useCallback(
    async (data: ReceiptTransactionData): Promise<string | null> => {
      setIsGenerating(true);
      setError(null);
      try {
        const result = await generateReceiptPdf(data, {
          ...config,
          autoDownload: false,
        });
        return result.dataUrl;
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error("Échec de la génération du reçu");
        setError(e);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(config)]
  );

  // Génère + envoie par email
  const sendByEmail = useCallback(
    async (to: string, data: ReceiptTransactionData): Promise<void> => {
      if (!config.email) {
        throw new Error(
          "Configuration email manquante. Fournissez config.email dans usePaymentReceipt."
        );
      }

      setIsSending(true);
      setError(null);
      try {
        const result = await generateReceiptPdf(data, {
          ...config,
          autoDownload: false,
        });
        await sendReceiptEmail(
          to,
          {
            pdfBlob: result.blob,
            dataUrl: result.dataUrl,
            filename: result.filename,
            transactionData: data,
          },
          config.email
        );
      } catch (err) {
        const e =
          err instanceof Error
            ? err
            : new Error("Échec de l'envoi du reçu par email");
        setError(e);
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(config)]
  );

  return {
    generateAndDownload,
    generateBlob,
    generateDataUrl,
    sendByEmail,
    isGenerating,
    isSending,
    error,
    clearError,
  };
}
