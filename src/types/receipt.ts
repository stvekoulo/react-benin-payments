import type { Currency } from "./index";
import type { PaymentProviderId } from "../core/types";

/**
 * Données de transaction utilisées pour remplir le reçu.
 */
export interface ReceiptTransactionData {
  /** Identifiant unique de la transaction */
  transactionId: string;
  /** Montant de la transaction */
  amount: number;
  /** Devise (remplace la devise du config si fournie) */
  currency?: Currency;
  /** Statut affiché sur le reçu (ex: "Approuvé", "Succès") */
  status?: string;
  /** Date de la transaction — chaîne ISO ou objet Date (défaut: maintenant) */
  date?: string | Date;
  /** Nom complet du client */
  customerName?: string;
  /** Email du client */
  customerEmail?: string;
  /** Téléphone du client */
  customerPhone?: string;
  /** Nom du service ou produit */
  serviceName?: string;
  /** Description détaillée */
  description?: string;
  /** Provider de paiement utilisé — `"fedapay"` / `"kkiapay"`, ou l'identifiant d'un driver personnalisé */
  provider?: PaymentProviderId;
  /** Métadonnées supplémentaires (non affichées, disponibles dans les callbacks) */
  metadata?: Record<string, unknown>;
}

/**
 * Champ personnalisé ajouté à la table des détails.
 */
export interface ReceiptField {
  /** Libellé affiché à gauche */
  label: string;
  /**
   * Valeur affichée à droite.
   * Peut être une fonction qui reçoit les données de transaction.
   */
  value: string | number | ((data: ReceiptTransactionData) => string | number);
}

/**
 * Libellés textuels affichés dans le reçu.
 * Tous les champs peuvent être redéfinis via `config.labels`.
 */
export interface ReceiptLabels {
  receiptTitle: string;
  invoiceNumberLabel: string;
  transactionIdLabel: string;
  amountLabel: string;
  dateLabel: string;
  statusLabel: string;
  fromLabel: string;
  toLabel: string;
  serviceLabel: string;
  descriptionLabel: string;
  totalLabel: string;
  thankYouNote: string;
}

/**
 * Paramètres passés à la fonction d'envoi d'email personnalisée.
 */
export interface ReceiptEmailParams {
  /** Adresse email du destinataire */
  to: string;
  /** Objet de l'email */
  subject: string;
  /** PDF encodé en base64 */
  pdfBase64: string;
  /** PDF sous forme de Blob */
  pdfBlob: Blob;
  /** Nom du fichier PDF (avec extension) */
  filename: string;
  /** Données de transaction ayant servi à générer le reçu */
  transactionData: ReceiptTransactionData;
}

/**
 * Configuration du service d'envoi d'email.
 *
 * Deux modes sont disponibles :
 * - `sendFn` — fonction async personnalisée (intégration directe avec votre service)
 * - `sendUrl` — endpoint HTTP auquel le PDF est posté en JSON
 *
 * @example
 * ```ts
 * // Mode fonction (Resend, SendGrid, Nodemailer, etc.)
 * email: {
 *   sendFn: async ({ to, subject, pdfBase64, filename }) => {
 *     await resend.emails.send({ from: "no-reply@shop.bj", to, subject,
 *       attachments: [{ filename, content: pdfBase64 }] });
 *   }
 * }
 *
 * // Mode URL (appel REST vers votre backend)
 * email: {
 *   sendUrl: "/api/send-receipt",
 *   sendHeaders: { Authorization: "Bearer xxx" },
 *   subject: (data) => `Votre reçu — ${data.transactionId}`
 * }
 * ```
 */
export interface ReceiptEmailConfig {
  /**
   * Fonction async personnalisée gérant l'envoi.
   * Reçoit le PDF en base64 + Blob ainsi que toutes les métadonnées.
   */
  sendFn?: (params: ReceiptEmailParams) => Promise<void>;
  /**
   * URL d'un endpoint HTTP (POST) pour déléguer l'envoi au backend.
   * Le corps JSON envoyé : `{ to, subject, pdfBase64, filename, bodyHtml, bodyText, transactionData }`
   */
  sendUrl?: string;
  /**
   * En-têtes HTTP supplémentaires pour `sendUrl`.
   * @example { "Authorization": "Bearer xxx" }
   */
  sendHeaders?: Record<string, string>;
  /**
   * Objet de l'email. Peut être une chaîne fixe ou une fonction.
   * @default "Votre reçu de paiement"
   */
  subject?: string | ((data: ReceiptTransactionData) => string);
  /**
   * Corps HTML de l'email (optionnel, transmis à `sendUrl` ou `sendFn`).
   */
  bodyHtml?: string | ((data: ReceiptTransactionData) => string);
  /**
   * Corps texte brut de l'email (optionnel).
   */
  bodyText?: string | ((data: ReceiptTransactionData) => string);
}

/**
 * Configuration complète pour la génération du reçu PDF.
 *
 * @example
 * ```tsx
 * const { generateAndDownload, sendByEmail } = usePaymentReceipt({
 *   appName: "MonShop",
 *   logo: "/logo.png",
 *   primaryColor: "#22C55E",
 *   invoicePrefix: "CMD-",
 *   invoiceNumber: (data) => `CMD-${data.transactionId.slice(-6)}`,
 *   footerNote: "Merci pour votre achat !",
 *   extraFields: [{ label: "Référence commande", value: "ORD-001" }],
 *   email: {
 *     sendFn: async ({ to, pdfBase64, filename }) => { ... },
 *     subject: (data) => `Reçu #${data.transactionId}`,
 *   },
 * });
 * ```
 */
export interface ReceiptConfig {
  /**
   * URL ou image base64 pour le logo (PNG ou JPEG).
   * Affiché en haut à gauche du reçu.
   */
  logo?: string;
  /** Nom de l'application ou de l'entreprise */
  appName?: string;
  /** Description courte ou slogan */
  appDescription?: string;
  /** Adresse physique */
  appAddress?: string;
  /** Email de contact */
  appEmail?: string;
  /** Numéro de téléphone */
  appPhone?: string;
  /** Site web (affiché également dans la barre de pied de page) */
  appWebsite?: string;

  /**
   * Préfixe ajouté devant le numéro de facture.
   * @default "FAC-"
   */
  invoicePrefix?: string;
  /**
   * Numéro de facture. Peut être :
   * - un nombre ou une chaîne statique : `1042` → `"FAC-1042"`
   * - une fonction dynamique : `(data) => \`FAC-\${data.transactionId.slice(-6)}\``
   *
   * Si omis, le numéro est dérivé des 8 derniers caractères de `transactionId`.
   */
  invoiceNumber?: string | number | ((data: ReceiptTransactionData) => string | number);

  /**
   * Lignes supplémentaires ajoutées à la table des détails.
   * @example [{ label: "Numéro de commande", value: "ORD-456" }]
   */
  extraFields?: ReceiptField[];

  /**
   * Couleur principale (hex) — bande de titre, barre totale, accents.
   * @default "#4E6BFF"
   */
  primaryColor?: string;
  /**
   * Couleur secondaire (hex) — fond des lignes paires du tableau.
   * @default "#EEF2FF"
   */
  secondaryColor?: string;
  /**
   * Couleur du texte principal (hex).
   * @default "#1A1A2E"
   */
  textColor?: string;

  /**
   * Locale BCP 47 pour le formatage des montants et des dates.
   * @default "fr-BJ"
   */
  locale?: string;
  /**
   * Devise par défaut (remplacée par `data.currency` si fournie).
   * @default "XOF"
   */
  currency?: Currency;
  /**
   * Redéfinition partielle ou totale des libellés affichés.
   */
  labels?: Partial<ReceiptLabels>;

  /**
   * Note affichée en bas du reçu.
   * @default "Merci pour votre paiement."
   */
  footerNote?: string;

  /**
   * Nom du fichier PDF généré (sans extension `.pdf`).
   * Peut être une fonction recevant les données de transaction.
   * @default `"recu-${data.transactionId}"`
   */
  filename?: string | ((data: ReceiptTransactionData) => string);
  /**
   * Déclenche automatiquement le téléchargement dans le navigateur après génération.
   * Mettre à `false` pour utiliser uniquement `generateBlob` ou `generateDataUrl`.
   * @default true
   */
  autoDownload?: boolean;

  /**
   * Appelé après chaque génération réussie.
   * Reçoit le Blob PDF et le data URL base64.
   */
  onGenerated?: (blob: Blob, dataUrl: string) => void;

  /**
   * Remplace entièrement le générateur PDF par défaut (jsPDF) par le vôtre.
   *
   * Utile si vous avez déjà votre propre template, une génération côté
   * serveur, ou si vous préférez une autre librairie que jsPDF. Le reste de
   * `usePaymentReceipt` (téléchargement, data URL, envoi par email) continue
   * de fonctionner normalement à partir du `Blob` que vous retournez.
   *
   * Quand `renderPdf` est fourni, jsPDF n'est **jamais** chargé — vous n'avez
   * donc pas besoin de l'installer.
   *
   * @example
   * ```ts
   * renderPdf: async (data) => {
   *   const blob = await monGenerateurMaison(data);
   *   return { blob, filename: `facture-${data.transactionId}` };
   * }
   * ```
   */
  renderPdf?: (
    data: ReceiptTransactionData,
    config: ReceiptConfig
  ) =>
    | Promise<{ blob: Blob; filename?: string }>
    | { blob: Blob; filename?: string };

  /**
   * Configuration du service d'envoi d'email.
   * Nécessaire pour appeler `sendByEmail`.
   */
  email?: ReceiptEmailConfig;
}
