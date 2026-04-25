import type {
  ReceiptEmailConfig,
  ReceiptEmailParams,
  ReceiptTransactionData,
} from "../types/receipt";

interface SendReceiptEmailInput {
  pdfBlob: Blob;
  dataUrl: string;
  filename: string;
  transactionData: ReceiptTransactionData;
}

/**
 * Envoie un reçu PDF par email via la configuration fournie.
 *
 * Deux stratégies sont supportées :
 * - `sendFn` — délègue à une fonction async personnalisée (Resend, SendGrid, etc.)
 * - `sendUrl` — POST JSON vers un endpoint HTTP de votre backend
 *
 * @throws si ni `sendFn` ni `sendUrl` ne sont configurés
 * @throws si la requête HTTP retourne un statut d'erreur (mode `sendUrl`)
 */
export async function sendReceiptEmail(
  to: string,
  input: SendReceiptEmailInput,
  emailConfig: ReceiptEmailConfig
): Promise<void> {
  // Extraire le base64 pur depuis le data URL ("data:application/pdf;base64,XXX")
  const pdfBase64 = input.dataUrl.includes(",")
    ? (input.dataUrl.split(",")[1] ?? input.dataUrl)
    : input.dataUrl;

  const subject =
    typeof emailConfig.subject === "function"
      ? emailConfig.subject(input.transactionData)
      : (emailConfig.subject ?? "Votre reçu de paiement");

  const params: ReceiptEmailParams = {
    to,
    subject,
    pdfBase64,
    pdfBlob: input.pdfBlob,
    filename: `${input.filename}.pdf`,
    transactionData: input.transactionData,
  };

  if (emailConfig.sendFn) {
    await emailConfig.sendFn(params);
    return;
  }

  if (emailConfig.sendUrl) {
    const bodyHtml =
      typeof emailConfig.bodyHtml === "function"
        ? emailConfig.bodyHtml(input.transactionData)
        : emailConfig.bodyHtml;

    const bodyText =
      typeof emailConfig.bodyText === "function"
        ? emailConfig.bodyText(input.transactionData)
        : emailConfig.bodyText;

    const response = await fetch(emailConfig.sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...emailConfig.sendHeaders,
      },
      body: JSON.stringify({
        to,
        subject,
        pdfBase64,
        filename: params.filename,
        bodyHtml,
        bodyText,
        transactionData: input.transactionData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erreur inconnue");
      throw new Error(
        `Échec de l'envoi du reçu par email : ${response.status} ${errorText}`
      );
    }
    return;
  }

  throw new Error(
    "Configuration email invalide : fournissez sendFn ou sendUrl dans config.email."
  );
}
