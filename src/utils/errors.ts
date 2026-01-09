"use client";

/**
 * Common error patterns and their user-friendly translations.
 */
const ERROR_PATTERNS: { pattern: RegExp; message: string }[] = [
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

/**
 * Parses an error and returns a user-friendly message in French.
 * 
 * @param error - The error to parse (can be any type)
 * @returns A clean, user-friendly error message
 * 
 * @example
 * ```ts
 * parseError(new Error("Network connection failed"));
 * // Returns: "Problème de connexion internet."
 * 
 * parseError({ message: "User closed the dialog" });
 * // Returns: "Paiement annulé."
 * 
 * parseError("insufficient funds");
 * // Returns: "Solde insuffisant sur votre compte."
 * ```
 */
export function parseError(error: unknown): string {
  const defaultMessage = "Une erreur inconnue est survenue.";

  if (!error) {
    return defaultMessage;
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
    return defaultMessage;
  }

  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  return errorMessage || defaultMessage;
}

/**
 * Creates a standardized error object with parsed message.
 * 
 * @param error - The raw error
 * @returns An Error object with a user-friendly message
 */
export function createParsedError(error: unknown): Error {
  const message = parseError(error);
  return new Error(message);
}
