"use client";

/**
 * Framework-agnostic payment engine.
 *
 * `useFedaPay` and `useKkiaPay` are both thin React bindings over the same
 * engine, configured with a `PaymentDriver` for their respective SDK (see
 * `src/providers/fedapay.ts` and `src/providers/kkiapay.ts` for real-world
 * examples to copy from).
 *
 * Import this from `react-benin-payments/core` to plug in a payment
 * provider this package doesn't ship (CinetPay, PayDunya, Stripe, a
 * donation platform's own gateway, an internal company PSP...) and get the
 * same script loading, mock mode, `onBeforePayment` hook, backend
 * verification and standardized analytics for free — in an e-commerce
 * checkout, a SaaS billing page, a donation form, or anything else.
 *
 * `createPaymentEngine` itself has no React dependency, so it can also be
 * driven manually (`subscribe` / `getState` / `open`) from any other UI
 * layer.
 */

export { createPaymentEngine } from "./createPaymentEngine";
export { usePaymentEngine } from "./usePaymentEngine";

export type {
  PaymentProvider,
  PaymentProviderId,
  PaymentEngine,
  PaymentEngineState,
  PaymentEngineOptions,
  PaymentDriver,
  PaymentDriverHandlers,
  PaymentDriverContext,
  VerifyPayloadInput,
} from "./types";

export type {
  ValidationErrorCode,
  PaymentValidationError,
  PaymentMessageOverrides,
  ErrorMessageResolver,
} from "../types/validation";

// Building blocks re-exported for authors writing their own driver — the
// built-in FedaPay/KKiaPay drivers are built from these same pieces.
export { loadScript } from "../utils/scriptLoader";
export { createLogger } from "../utils/logger";
export type { Logger } from "../utils/logger";
export { verifyTransaction, VerificationError } from "../utils/verifyTransaction";
export type { VerifyPayload } from "../utils/verifyTransaction";
export { validateKeyEnvironment, logSandboxMode } from "../utils/keyValidator";
export type { EnvironmentWarningMessages } from "../utils/keyValidator";
export { validatePublicKeyAndAmount } from "./validateCommonConfig";
export { generateMockTransactionId } from "../utils/currency";
export { parseError, createParsedError, DEFAULT_ERROR_PATTERNS } from "../utils/errors";
export type { ErrorPattern, ParseErrorOptions } from "../utils/errors";
