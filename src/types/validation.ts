/**
 * Validation error codes for payment operations.
 */
export type ValidationErrorCode =
  | "INVALID_AMOUNT"
  | "MISSING_PUBLIC_KEY"
  | "SDK_NOT_LOADED"
  | "SDK_ERROR"
  | "PRE_VALIDATION_FAILED";

/**
 * Validation error returned when payment configuration is invalid.
 */
export interface PaymentValidationError {
  /** Machine-readable error code */
  code: ValidationErrorCode;
  /** Human-readable error message */
  message: string;
}

/**
 * Overrides the wording of built-in validation error messages, keyed by
 * `ValidationErrorCode`. Any code you don't include keeps its default
 * (English) message. Set globally via `BeninPaymentProvider`, or per-hook
 * via `useFedaPay`/`useKkiaPay` options (which take precedence).
 *
 * @example
 * ```ts
 * const messages: PaymentMessageOverrides = {
 *   MISSING_PUBLIC_KEY: "Clé API manquante.",
 *   INVALID_AMOUNT: "Montant invalide.",
 * };
 * ```
 */
export type PaymentMessageOverrides = Partial<Record<ValidationErrorCode, string>>;

/**
 * Resolves a user-facing message for an arbitrary caught error (SDK load
 * failures, network errors...). Return `undefined` to fall through to the
 * next resolver (local → global → the built-in `parseError` translations),
 * so you can override just the cases you care about.
 *
 * @example
 * ```ts
 * const resolveErrorMessage: ErrorMessageResolver = (error) => {
 *   const msg = error instanceof Error ? error.message : String(error);
 *   if (/network|offline/i.test(msg)) return "No internet connection.";
 *   return undefined; // fall back to the default translation
 * };
 * ```
 */
export type ErrorMessageResolver = (error: unknown) => string | undefined;
