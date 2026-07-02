import type { PaymentValidationError } from "../types/validation";

/**
 * The most common `PaymentDriver.validate` shape: a required public key
 * (unless in mock mode) and a positive amount. Both built-in drivers
 * (FedaPay, KKiaPay) use this — reach for it in a custom driver too instead
 * of re-implementing the same two checks.
 *
 * @example
 * ```ts
 * validate: (config, { isMockMode }) =>
 *   validatePublicKeyAndAmount(config.apiKey, config.amount, isMockMode),
 * ```
 */
export function validatePublicKeyAndAmount(
  publicKey: string | undefined,
  amount: number | undefined,
  isMockMode: boolean
): PaymentValidationError | null {
  if (!isMockMode && (!publicKey || publicKey.trim() === "")) {
    return {
      code: "MISSING_PUBLIC_KEY",
      message: "Missing Public Key. Provide it via config or BeninPaymentProvider.",
    };
  }
  if (!amount || amount <= 0) {
    return { code: "INVALID_AMOUNT", message: "Invalid amount. Amount must be greater than 0." };
  }
  return null;
}
