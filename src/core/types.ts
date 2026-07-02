import type { Logger } from "../utils/logger";
import type { EnvironmentWarningMessages } from "../utils/keyValidator";
import type {
  ErrorMessageResolver,
  PaymentMessageOverrides,
  PaymentValidationError,
} from "../types/validation";
import type {
  BeninPaymentAnalyticsEvent,
  BeninPaymentAnalyticsHandler,
} from "../utils/analytics";

/**
 * Payment providers built into this package.
 */
export type PaymentProvider = "fedapay" | "kkiapay";

/**
 * Identifier for any payment provider driver — the two built-in ones plus
 * whatever string a custom driver picks (e.g. `"cinetpay"`, `"paydunya"`,
 * `"stripe"`). Kept separate from `PaymentProvider` so that `useBeninPay`,
 * `usePaymentHistory` and analytics for the built-in providers keep exact
 * `"fedapay" | "kkiapay"` autocomplete, while `PaymentDriver.name` and
 * `BeninPaymentAnalyticsEvent.provider` stay open to custom providers.
 */
// `string & {}` is the standard TS idiom to widen a literal union to `string`
// while keeping autocomplete for the known members; `string` alone loses that.
// eslint-disable-next-line @typescript-eslint/ban-types
export type PaymentProviderId = PaymentProvider | (string & {});

/**
 * Public, subscribable state exposed by a payment engine instance.
 */
export interface PaymentEngineState {
  loading: boolean;
  scriptLoaded: boolean;
  error: Error | null;
  isVerifying: boolean;
  isPreparing: boolean;
}

/** Data extracted from a provider's raw success payload, needed to verify a transaction with a backend. */
export interface VerifyPayloadInput {
  transactionId: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

/** Stable callbacks a driver uses to report SDK events back to the engine. */
export interface PaymentDriverHandlers<TRaw> {
  onSuccess: (raw: TRaw) => void;
  onFailure: (raw: unknown) => void;
  onClose: () => void;
}

/** Context handed to a driver's `open()` call for logging and analytics. */
export interface PaymentDriverContext {
  log: Logger;
  isMockMode: boolean;
  /** Emits a standardized analytics event; `provider`, `mode` and `amount` are filled in automatically unless overridden. */
  emit: (
    event: Partial<Omit<BeninPaymentAnalyticsEvent, "timestamp" | "provider">> & {
      name: BeninPaymentAnalyticsEvent["name"];
    }
  ) => void;
}

/**
 * Adapter contract a payment provider (FedaPay, KKiaPay, or a custom one)
 * must implement to plug into `createPaymentEngine`.
 *
 * The engine has zero dependency on React or on any specific provider — it
 * only talks to this interface. That's what makes it reusable outside of
 * this package (a different UI framework, or a provider we don't ship).
 */
export interface PaymentDriver<TConfig, TRaw> {
  name: PaymentProviderId;
  scriptUrl: string;
  scriptId: string;
  /** Returns true once the provider's SDK is available on `window`. */
  isSdkReady: () => boolean;
  /** Optional dev-time warnings (e.g. a live key used while sandbox mode is on). */
  logEnvironmentWarnings?: (
    config: TConfig,
    ctx: { isMockMode: boolean; environmentWarnings?: EnvironmentWarningMessages }
  ) => void;
  /** Returns a validation error, or `null` if the config is valid for this provider. */
  validate: (config: TConfig, ctx: { isMockMode: boolean }) => PaymentValidationError | null;
  getAmount: (config: TConfig | undefined) => number | undefined;
  /** Extra fields (e.g. `currency`) merged into every analytics event for this provider. */
  getAnalyticsExtras?: (config: TConfig | undefined) => Record<string, unknown>;
  /** Builds the fake success payload used when `mock: true`. */
  buildMockSuccess: (config: TConfig) => TRaw;
  /** Normalizes a raw success payload into what's needed for backend verification. */
  toVerifyPayload: (raw: TRaw, config: TConfig) => VerifyPayloadInput;
  getStatus?: (raw: TRaw) => string | undefined;
  /**
   * Triggers the actual checkout/widget for a single payment attempt.
   *
   * `handlers` is bound to this specific call's `config` — for an SDK that
   * only exposes a persistent/global event bus instead of per-call
   * callbacks (e.g. KKiaPay's `addKkiapayListener`), store `handlers` in a
   * module-level "active call" reference before triggering the SDK, and
   * clear it once a terminal event (success/failure/close) fires. Don't
   * keep a persistent per-engine subscription — the SDK only supports one
   * open widget at a time, so a persistent subscription would relay events
   * to every mounted instance instead of just the one that opened it.
   */
  open: (
    config: TConfig,
    handlers: PaymentDriverHandlers<TRaw>,
    ctx: PaymentDriverContext
  ) => void;
}

export interface PaymentEngineOptions<TConfig, TRaw> {
  debug?: boolean;
  isMockMode: boolean;
  verification?: {
    verifyUrl?: string;
    verifyMethod?: "POST" | "GET";
    customVerifyHeaders?: Record<string, string>;
  };
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  globalAnalyticsHandler?: BeninPaymentAnalyticsHandler;
  onRawSuccess?: (raw: TRaw) => void;
  onRawFailure?: (raw: unknown) => void;
  onClose?: () => void;
  onValidationError?: (error: PaymentValidationError) => void;
  /** Latest known config, used only for analytics emitted before any `open()` call (e.g. SDK load events). */
  getAnalyticsConfig?: () => TConfig | undefined;
  /** Overrides the wording of validation error messages, keyed by error code. */
  messages?: PaymentMessageOverrides;
  /** Resolves the message for arbitrary caught errors (SDK load failures...); falls back to `parseError`. */
  resolveErrorMessage?: ErrorMessageResolver;
  /** Overrides the wording of dev-time console warnings (live key in sandbox, etc.). */
  environmentWarnings?: EnvironmentWarningMessages;
}

export interface PaymentEngine<TConfig> {
  getState: () => PaymentEngineState;
  subscribe: (listener: () => void) => () => void;
  /** Starts the background lifecycle (script loading, persistent listeners). Returns a cleanup function. */
  start: () => () => void;
  open: (config: TConfig) => void;
}
