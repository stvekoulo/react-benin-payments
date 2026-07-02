/**
 * A pattern matched against a raw error message, with the user-facing
 * message to show when it matches.
 */
export interface ErrorPattern {
  pattern: RegExp;
  message: string;
}

/**
 * Options to fully control `parseError`'s output — pass your own patterns
 * and/or fallback message to translate or reword the built-in French
 * defaults, instead of being stuck with them.
 */
export interface ParseErrorOptions {
  /**
   * Patterns checked in order; the first match wins. Defaults to
   * `DEFAULT_ERROR_PATTERNS`. Spread the defaults in if you only want to
   * add or reorder a few: `{ patterns: [...myPatterns, ...DEFAULT_ERROR_PATTERNS] }`.
   */
  patterns?: ErrorPattern[];
  /** Returned when nothing matches and the error has no usable message. */
  fallbackMessage?: string;
}

/**
 * Default error patterns and their French, user-friendly translations.
 * Exported so you can extend rather than fully replace them — see
 * `ParseErrorOptions.patterns`.
 */
export const DEFAULT_ERROR_PATTERNS: ErrorPattern[] = [
  { pattern: /closed|dismissed|cancel/i, message: "Paiement annulé." },
  { pattern: /insufficient.*(fund|balance)/i, message: "Solde insuffisant sur votre compte." },
  { pattern: /network|connection|offline/i, message: "Problème de connexion internet." },
  { pattern: /timeout/i, message: "La requête a expiré. Veuillez réessayer." },
  { pattern: /invalid.*key/i, message: "Clé API invalide." },
  { pattern: /invalid.*amount/i, message: "Montant invalide." },
  { pattern: /unauthorized|401/i, message: "Accès non autorisé." },
  { pattern: /not.*found|404/i, message: "Ressource introuvable." },
  { pattern: /server.*error|500/i, message: "Erreur serveur. Veuillez réessayer." },
];

const DEFAULT_FALLBACK_MESSAGE = "Une erreur inconnue est survenue.";

/**
 * Parses an error and returns a user-friendly message.
 *
 * Defaults to French translations (`DEFAULT_ERROR_PATTERNS`), but you're
 * never stuck with them — pass your own `patterns` and/or `fallbackMessage`
 * to translate or reword every message this library can produce.
 *
 * @param error - The error to parse (can be any type)
 * @param options - Optional custom patterns / fallback message
 * @returns A clean, user-friendly error message
 *
 * @example
 * ```ts
 * parseError(new Error("Network connection failed"));
 * // Returns: "Problème de connexion internet."
 *
 * // Full control — e.g. an English-speaking product:
 * parseError(err, {
 *   patterns: [
 *     { pattern: /closed|dismissed|cancel/i, message: "Payment cancelled." },
 *     { pattern: /network|connection|offline/i, message: "No internet connection." },
 *   ],
 *   fallbackMessage: "Something went wrong.",
 * });
 * ```
 */
export function parseError(error: unknown, options: ParseErrorOptions = {}): string {
  const patterns = options.patterns ?? DEFAULT_ERROR_PATTERNS;
  const fallbackMessage = options.fallbackMessage ?? DEFAULT_FALLBACK_MESSAGE;

  if (!error) {
    return fallbackMessage;
  }

  let errorMessage: string;

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;
    errorMessage =
      (errorObj.message as string) ||
      (errorObj.error as string) ||
      (errorObj.msg as string) ||
      JSON.stringify(error);
  } else {
    return fallbackMessage;
  }

  for (const { pattern, message } of patterns) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  return errorMessage || fallbackMessage;
}

/**
 * Creates a standardized error object with parsed message.
 *
 * @param error - The raw error
 * @param options - Optional custom patterns / fallback message, forwarded to `parseError`
 * @returns An Error object with a user-friendly message
 */
export function createParsedError(error: unknown, options?: ParseErrorOptions): Error {
  return new Error(parseError(error, options));
}
