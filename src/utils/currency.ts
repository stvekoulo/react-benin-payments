import type { Currency } from "../types";

/**
 * Formats an amount in XOF (West African CFA Franc).
 * 
 * @param amount - The amount to format
 * @returns Formatted string with FCFA suffix (e.g., "5 000 FCFA")
 * 
 * @example
 * ```ts
 * formatXOF(5000);    // "5 000 FCFA"
 * formatXOF(1500000); // "1 500 000 FCFA"
 * formatXOF(0);       // "0 FCFA"
 * ```
 */
export function formatXOF(amount: number): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return `${formatted} FCFA`;
}

/**
 * Formats an amount in the specified currency.
 * 
 * @param amount - The amount to format
 * @param currency - The currency code (XOF, USD, EUR)
 * @returns Formatted string with currency symbol
 * 
 * @example
 * ```ts
 * formatCurrency(5000, "XOF");  // "5 000 FCFA"
 * formatCurrency(100, "USD");   // "$100.00"
 * formatCurrency(100, "EUR");   // "100,00 €"
 * ```
 */
export function formatCurrency(amount: number, currency: Currency): string {
  switch (currency) {
    case "XOF":
      return formatXOF(amount);
    case "USD":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    case "EUR":
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(amount);
    default:
      return `${amount} ${currency}`;
  }
}

/**
 * Generates a mock transaction ID for testing.
 * 
 * @returns A unique mock transaction ID
 */
export function generateMockTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `mock_tx_${timestamp}_${random}`;
}
