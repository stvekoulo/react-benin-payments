import type {
  ReceiptConfig,
  ReceiptTransactionData,
  ReceiptLabels,
} from "../types/receipt";
import type { Currency } from "../types";
import type { PaymentProviderId } from "../core/types";
import { blobToDataUrl, triggerBlobDownload } from "./pdfHelpers";

/** Nice display name for the two built-in providers; any other driver's identifier is shown as-is. */
export function formatProviderName(provider: PaymentProviderId): string {
  if (provider === "fedapay") return "FedaPay";
  if (provider === "kkiapay") return "KKiaPay";
  return provider;
}

const DEFAULT_LABELS: ReceiptLabels = {
  receiptTitle: "REÇU DE PAIEMENT",
  invoiceNumberLabel: "N° Facture",
  transactionIdLabel: "ID Transaction",
  amountLabel: "Montant",
  dateLabel: "Date",
  statusLabel: "Statut",
  fromLabel: "DE",
  toLabel: "À",
  serviceLabel: "Service",
  descriptionLabel: "Description",
  totalLabel: "TOTAL",
  thankYouNote: "Merci pour votre paiement.",
};

const DEFAULT_PRIMARY = "#4E6BFF";
// Neutral hairline/rule color — kept configurable via `secondaryColor` for
// brand consistency, but no longer used as a loud background fill.
const DEFAULT_SECONDARY = "#E4E4E7";
const DEFAULT_TEXT = "#18181B";
const MUTED_TEXT: [number, number, number] = [113, 113, 122];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [78, 107, 255];
  return [r, g, b];
}

/**
 * jsPDF's built-in fonts (Helvetica) only cover the WinAnsi range. `Intl`
 * formatters commonly insert narrow/no-break spaces (e.g. as a thousands
 * separator) that fall outside it and render as garbled glyphs — normalize
 * them to a plain space before handing text to jsPDF.
 */
function toPdfSafeText(text: string): string {
  // U+00A0 no-break space, U+2007 figure space, U+2009 thin space,
  // U+200A hair space, U+202F narrow no-break space.
  return text.replace(/[\u00A0\u2007\u2009\u200A\u202F]/g, " ");
}

function formatAmount(amount: number, currency: Currency, locale: string): string {
  try {
    return toPdfSafeText(
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
      }).format(amount)
    );
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}

function formatDate(date: string | Date | undefined, locale: string): string {
  const d = date ? new Date(date) : new Date();
  try {
    return toPdfSafeText(
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
    );
  } catch {
    return d.toLocaleDateString();
  }
}

function resolveInvoiceNumber(
  config: ReceiptConfig,
  data: ReceiptTransactionData
): string {
  const prefix = config.invoicePrefix ?? "FAC-";
  if (!config.invoiceNumber) {
    return `${prefix}${data.transactionId.slice(-8).toUpperCase()}`;
  }
  if (typeof config.invoiceNumber === "function") {
    return String(config.invoiceNumber(data));
  }
  return `${prefix}${config.invoiceNumber}`;
}

function resolveFilename(
  config: ReceiptConfig,
  data: ReceiptTransactionData
): string {
  if (!config.filename) return `recu-${data.transactionId}`;
  if (typeof config.filename === "function") return config.filename(data);
  return config.filename;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

export interface GenerateReceiptResult {
  blob: Blob;
  dataUrl: string;
  /** Nom du fichier sans extension */
  filename: string;
}

/** Résultat interne d'un rendu (par défaut ou personnalisé), avant résolution du nom de fichier / data URL. */
interface RenderedPdf {
  blob: Blob;
  dataUrl?: string;
  filename?: string;
}

/**
 * Génère le reçu PDF par défaut avec jsPDF.
 *
 * jsPDF est chargé dynamiquement — il n'est requis (et donc installé) que si
 * `config.renderPdf` n'est pas fourni. C'est un peer dependency optionnel :
 * `npm install jspdf`.
 */
async function renderDefaultPdf(
  data: ReceiptTransactionData,
  config: ReceiptConfig
): Promise<RenderedPdf> {
  let jsPDF: (typeof import("jspdf"))["jsPDF"];
  try {
    ({ jsPDF } = await import("jspdf"));
  } catch {
    throw new Error(
      "Le générateur de reçu par défaut nécessite jsPDF. Exécutez `npm install jspdf`, " +
        "ou fournissez `config.renderPdf` pour utiliser votre propre générateur de PDF."
    );
  }

  const locale = config.locale ?? "fr-BJ";
  const currency: Currency = data.currency ?? config.currency ?? "XOF";
  const labels: ReceiptLabels = { ...DEFAULT_LABELS, ...config.labels };

  const [pr, pg, pb] = hexToRgb(config.primaryColor ?? DEFAULT_PRIMARY);
  const [lr, lg, lb] = hexToRgb(config.secondaryColor ?? DEFAULT_SECONDARY);
  const [tr, tg, tb] = hexToRgb(config.textColor ?? DEFAULT_TEXT);
  const [mr, mg, mb] = MUTED_TEXT;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const hairline = (y: number, weight = 0.25) => {
    doc.setDrawColor(lr, lg, lb);
    doc.setLineWidth(weight);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  };

  // Thin brand-colored bar at the very top edge — the only block of color on
  // the page. Everything else relies on whitespace, hairlines and typography.
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, PAGE_W, 2.5, "F");

  const headerTop = 14;

  // Logo + company identity (left)
  let leftX = MARGIN;
  if (config.logo) {
    try {
      let logoData = config.logo;
      if (config.logo.startsWith("http")) {
        logoData = await fetchImageAsBase64(config.logo);
      }
      const imgType = logoData.includes("data:image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(logoData, imgType, MARGIN, headerTop, 16, 16);
      leftX = MARGIN + 16 + 6;
    } catch {
      // Logo unavailable — continue without it.
    }
  }

  let leftY = headerTop + 4;
  if (config.appName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(tr, tg, tb);
    doc.text(config.appName, leftX, leftY);
    leftY += 6;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(mr, mg, mb);
  for (const line of [
    config.appDescription,
    config.appAddress,
    config.appEmail,
    config.appPhone,
    config.appWebsite,
  ]) {
    if (line) {
      doc.text(line, leftX, leftY);
      leftY += 4.5;
    }
  }

  // Title + invoice number + date (right)
  const invoiceNum = resolveInvoiceNumber(config, data);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(mr, mg, mb);
  doc.text(labels.receiptTitle.toUpperCase(), PAGE_W - MARGIN, headerTop + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(tr, tg, tb);
  doc.text(`${labels.invoiceNumberLabel} ${invoiceNum}`, PAGE_W - MARGIN, headerTop + 11, {
    align: "right",
  });
  doc.setFontSize(8.5);
  doc.setTextColor(mr, mg, mb);
  doc.text(formatDate(data.date, locale), PAGE_W - MARGIN, headerTop + 16.5, { align: "right" });

  let y = Math.max(leftY, headerTop + 22) + 5;
  hairline(y);
  y += 9;

  // From / To
  const midX = MARGIN + CONTENT_W / 2 + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(mr, mg, mb);
  doc.text(labels.fromLabel.toUpperCase(), MARGIN, y);
  doc.text(labels.toLabel.toUpperCase(), midX, y);
  y += 5.5;

  doc.setFontSize(9.5);
  let fromY = y;
  let toY = y;

  if (config.appName) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(tr, tg, tb);
    doc.text(config.appName, MARGIN, fromY);
    fromY += 5;
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mr, mg, mb);
  for (const line of [config.appAddress, config.appEmail, config.appPhone].filter(Boolean) as string[]) {
    doc.text(line, MARGIN, fromY);
    fromY += 5;
  }

  if (data.customerName) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(tr, tg, tb);
    doc.text(data.customerName, midX, toY);
    toY += 5;
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mr, mg, mb);
  for (const line of [data.customerEmail, data.customerPhone].filter(Boolean) as string[]) {
    doc.text(line, midX, toY);
    toY += 5;
  }

  y = Math.max(fromY, toY) + 7;
  hairline(y);
  y += 8;

  // Transaction details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(pr, pg, pb);
  doc.text("DÉTAILS DE LA TRANSACTION", MARGIN, y);
  y += 7;

  const rows: Array<{ label: string; value: string }> = [];
  rows.push({ label: labels.transactionIdLabel, value: data.transactionId });
  rows.push({ label: labels.dateLabel, value: formatDate(data.date, locale) });
  if (data.serviceName) rows.push({ label: labels.serviceLabel, value: data.serviceName });
  if (data.description) rows.push({ label: labels.descriptionLabel, value: data.description });
  if (data.provider) {
    rows.push({ label: "Fournisseur", value: formatProviderName(data.provider) });
  }
  if (data.status) rows.push({ label: labels.statusLabel, value: data.status });
  if (config.extraFields) {
    for (const field of config.extraFields) {
      const val = typeof field.value === "function" ? field.value(data) : field.value;
      rows.push({ label: field.label, value: String(val) });
    }
  }

  const ROW_H = 8;
  const LABEL_COL_W = 62;

  rows.forEach((row, i) => {
    const rowTop = y + i * ROW_H;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mr, mg, mb);
    doc.text(row.label, MARGIN, rowTop + 5);

    doc.setFontSize(9.5);
    doc.setTextColor(tr, tg, tb);
    doc.text(row.value, MARGIN + LABEL_COL_W, rowTop + 5);

    hairline(rowTop + ROW_H, 0.2);
  });

  y += rows.length * ROW_H + 10;

  // Total — emphasized with size and the brand color, not a filled block.
  hairline(y, 0.5);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(mr, mg, mb);
  doc.text(labels.totalLabel, MARGIN, y);
  doc.setFontSize(17);
  doc.setTextColor(pr, pg, pb);
  doc.text(formatAmount(data.amount, currency, locale), PAGE_W - MARGIN, y, { align: "right" });
  y += 14;

  const footerNote = config.footerNote ?? labels.thankYouNote;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(mr, mg, mb);
  doc.text(footerNote, PAGE_W / 2, y, { align: "center" });

  // Footer
  hairline(280);
  if (config.appWebsite) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(mr, mg, mb);
    doc.text(config.appWebsite, PAGE_W / 2, 286, { align: "center" });
  }

  return {
    blob: doc.output("blob"),
    dataUrl: doc.output("datauristring"),
  };
}

/**
 * Génère un reçu PDF à partir des données de transaction et d'une configuration
 * optionnelle de mise en page.
 *
 * Par défaut, utilise un template jsPDF minimaliste (chargé à la demande —
 * `npm install jspdf` requis). Fournissez `config.renderPdf` pour remplacer
 * entièrement ce rendu par le vôtre ; le téléchargement, le data URL et
 * l'envoi par email continuent de fonctionner à l'identique.
 *
 * @param data   Données de la transaction (ID, montant, client…)
 * @param config Configuration du design et du contenu du reçu
 * @returns      Blob, data URL base64 et nom du fichier
 */
export async function generateReceiptPdf(
  data: ReceiptTransactionData,
  config: ReceiptConfig = {}
): Promise<GenerateReceiptResult> {
  const rendered: RenderedPdf = config.renderPdf
    ? await config.renderPdf(data, config)
    : await renderDefaultPdf(data, config);

  const filename = rendered.filename ?? resolveFilename(config, data);
  const dataUrl = rendered.dataUrl ?? (await blobToDataUrl(rendered.blob));

  if (config.autoDownload !== false) {
    triggerBlobDownload(rendered.blob, filename);
  }

  config.onGenerated?.(rendered.blob, dataUrl);

  return { blob: rendered.blob, dataUrl, filename };
}
