import { jsPDF } from "jspdf";
import type {
  ReceiptConfig,
  ReceiptTransactionData,
  ReceiptLabels,
} from "../types/receipt";
import type { Currency } from "../types";

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
const DEFAULT_SECONDARY = "#EEF2FF";
const DEFAULT_TEXT = "#1A1A2E";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [78, 107, 255];
  return [r, g, b];
}

function formatAmount(amount: number, currency: Currency, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}

function formatDate(date: string | Date | undefined, locale: string): string {
  const d = date ? new Date(date) : new Date();
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface GenerateReceiptResult {
  blob: Blob;
  dataUrl: string;
  /** Nom du fichier sans extension */
  filename: string;
}

/**
 * Génère un reçu PDF à partir des données de transaction et d'une configuration
 * optionnelle de mise en page.
 *
 * Cette fonction peut être utilisée directement (côté client ou SSR) ou via le
 * hook `usePaymentReceipt` qui gère les états React (loading, error).
 *
 * @param data   Données de la transaction (ID, montant, client…)
 * @param config Configuration du design et du contenu du reçu
 * @returns      Blob, data URL base64 et nom du fichier
 */
export async function generateReceiptPdf(
  data: ReceiptTransactionData,
  config: ReceiptConfig = {}
): Promise<GenerateReceiptResult> {
  const locale = config.locale ?? "fr-BJ";
  const currency: Currency = data.currency ?? config.currency ?? "XOF";
  const labels: ReceiptLabels = { ...DEFAULT_LABELS, ...config.labels };

  const [pr, pg, pb] = hexToRgb(config.primaryColor ?? DEFAULT_PRIMARY);
  const [sr, sg, sb] = hexToRgb(config.secondaryColor ?? DEFAULT_SECONDARY);
  const [tr, tg, tb] = hexToRgb(config.textColor ?? DEFAULT_TEXT);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, PAGE_W, 50, "F");

  // Logo
  let logoEndX = MARGIN;
  if (config.logo) {
    try {
      let logoData = config.logo;
      if (config.logo.startsWith("http")) {
        logoData = await fetchImageAsBase64(config.logo);
      }
      const imgType = logoData.includes("data:image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(logoData, imgType, MARGIN, 9, 28, 28);
      logoEndX = MARGIN + 33;
    } catch {
      // Logo non disponible — on continue sans
    }
  }

  // Nom et infos de l'application (blanc, côté gauche)
  doc.setTextColor(255, 255, 255);
  let headerY = 19;
  if (config.appName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(config.appName, logoEndX, headerY);
    headerY += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  }
  const headerLines: string[] = [];
  if (config.appDescription) headerLines.push(config.appDescription);
  if (config.appAddress) headerLines.push(config.appAddress);
  if (config.appEmail) headerLines.push(config.appEmail);
  if (config.appPhone) headerLines.push(config.appPhone);
  if (config.appWebsite) headerLines.push(config.appWebsite);
  for (const line of headerLines) {
    doc.text(line, logoEndX, headerY);
    headerY += 5.5;
  }

  // Titre du reçu + numéro de facture (blanc, côté droit)
  const invoiceNum = resolveInvoiceNumber(config, data);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(labels.receiptTitle, PAGE_W - MARGIN, 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${labels.invoiceNumberLabel}: ${invoiceNum}`,
    PAGE_W - MARGIN,
    28,
    { align: "right" }
  );
  doc.text(formatDate(data.date, locale), PAGE_W - MARGIN, 36, {
    align: "right",
  });

  let y = 58;

  const midX = MARGIN + CONTENT_W / 2 + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(pr, pg, pb);
  doc.text(labels.fromLabel, MARGIN, y);
  doc.text(labels.toLabel, midX, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(tr, tg, tb);

  let fromY = y;
  let toY = y;

  if (config.appName) {
    doc.setFont("helvetica", "bold");
    doc.text(config.appName, MARGIN, fromY);
    fromY += 6;
    doc.setFont("helvetica", "normal");
  }
  for (const line of [config.appAddress, config.appEmail, config.appPhone].filter(Boolean) as string[]) {
    doc.text(line, MARGIN, fromY);
    fromY += 6;
  }

  if (data.customerName) {
    doc.setFont("helvetica", "bold");
    doc.text(data.customerName, midX, toY);
    toY += 6;
    doc.setFont("helvetica", "normal");
  }
  for (const line of [data.customerEmail, data.customerPhone].filter(Boolean) as string[]) {
    doc.text(line, midX, toY);
    toY += 6;
  }

  y = Math.max(fromY, toY) + 6;

  // Séparateur
  doc.setDrawColor(220, 220, 235);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(pr, pg, pb);
  doc.text("DÉTAILS DE LA TRANSACTION", MARGIN, y);
  y += 6;

  const rows: Array<{ label: string; value: string }> = [];
  rows.push({ label: labels.transactionIdLabel, value: data.transactionId });
  rows.push({ label: labels.dateLabel, value: formatDate(data.date, locale) });
  if (data.serviceName) {
    rows.push({ label: labels.serviceLabel, value: data.serviceName });
  }
  if (data.description) {
    rows.push({ label: labels.descriptionLabel, value: data.description });
  }
  if (data.provider) {
    rows.push({
      label: "Fournisseur",
      value: data.provider === "fedapay" ? "FedaPay" : "KKiaPay",
    });
  }
  if (data.status) {
    rows.push({ label: labels.statusLabel, value: data.status });
  }
  if (config.extraFields) {
    for (const field of config.extraFields) {
      const val =
        typeof field.value === "function" ? field.value(data) : field.value;
      rows.push({ label: field.label, value: String(val) });
    }
  }

  const ROW_H = 9;
  const LABEL_COL_W = 65;

  rows.forEach((row, i) => {
    const rowTop = y + i * ROW_H;
    if (i % 2 === 0) {
      doc.setFillColor(sr, sg, sb);
      doc.rect(MARGIN, rowTop, CONTENT_W, ROW_H, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 130);
    doc.text(row.label, MARGIN + 3, rowTop + ROW_H - 2.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(tr, tg, tb);
    doc.text(row.value, MARGIN + LABEL_COL_W, rowTop + ROW_H - 2.5);
  });

  y += rows.length * ROW_H + 4;

  doc.setFillColor(pr, pg, pb);
  doc.rect(MARGIN, y, CONTENT_W, 13, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(labels.totalLabel, MARGIN + 4, y + 8.5);
  doc.text(formatAmount(data.amount, currency, locale), PAGE_W - MARGIN - 4, y + 8.5, {
    align: "right",
  });

  y += 22;

  const footerNote = config.footerNote ?? labels.thankYouNote;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 170);
  doc.text(footerNote, PAGE_W / 2, y, { align: "center" });

  // Barre de pied de page
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 287, PAGE_W, 10, "F");
  if (config.appWebsite) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(config.appWebsite, PAGE_W / 2, 293, { align: "center" });
  }

  const filename = resolveFilename(config, data);

  if (config.autoDownload !== false) {
    doc.save(`${filename}.pdf`);
  }

  const blob = doc.output("blob");
  const dataUrl = doc.output("datauristring");

  config.onGenerated?.(blob, dataUrl);

  return { blob, dataUrl, filename };
}
