import { loadScript } from "../utils/scriptLoader";
import { createLogger } from "../utils/logger";
import { createAnalyticsEmitter, type BeninPaymentAnalyticsEvent } from "../utils/analytics";
import { parseError } from "../utils/errors";
import { verifyTransaction, VerificationError } from "../utils/verifyTransaction";
import type { PaymentValidationError } from "../types/validation";
import type {
  PaymentDriver,
  PaymentEngine,
  PaymentEngineOptions,
  PaymentEngineState,
} from "./types";

type AnalyticsEventInput = Omit<BeninPaymentAnalyticsEvent, "timestamp" | "provider">;

/**
 * Creates a framework-agnostic payment flow controller for a given provider
 * driver. Handles script loading, validation, mock simulation, the optional
 * `onBeforePayment` hook, backend verification and standardized analytics —
 * identically for every provider that implements `PaymentDriver`.
 *
 * This has no dependency on React: `subscribe`/`getState` can be wired into
 * any UI layer. `usePaymentEngine` is the thin React binding used internally
 * by `useFedaPay` / `useKkiaPay`.
 */
export function createPaymentEngine<TConfig, TRaw>(
  driver: PaymentDriver<TConfig, TRaw>,
  getOptions: () => PaymentEngineOptions<TConfig, TRaw>
): PaymentEngine<TConfig> {
  const initialMock = getOptions().isMockMode;

  let state: PaymentEngineState = {
    loading: !initialMock,
    scriptLoaded: initialMock,
    error: null,
    isVerifying: false,
    isPreparing: false,
  };
  let lastConfig: TConfig | null = null;
  let destroyed = false;
  const listeners = new Set<() => void>();

  function getState() {
    return state;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setState(patch: Partial<PaymentEngineState>) {
    state = { ...state, ...patch };
    // The `destroyed` guard is what makes it safe for usePaymentEngine to
    // swap in a new engine (e.g. when `isMockMode` changes) without
    // explicitly cancelling this one first: React runs this engine's
    // `start()` cleanup (which sets `destroyed = true`) before the new
    // engine's effect runs, so any in-flight promise/timer that resolves
    // late just updates dead internal state instead of notifying React.
    if (!destroyed) listeners.forEach((listener) => listener());
  }

  function getLog() {
    return createLogger(getOptions().debug ?? false);
  }

  function emit(event: AnalyticsEventInput, configForExtras: TConfig | undefined) {
    const options = getOptions();
    const emitter = createAnalyticsEmitter(
      [options.globalAnalyticsHandler, options.onAnalyticsEvent],
      getLog().warn
    );
    const extras = driver.getAnalyticsExtras?.(configForExtras) ?? {};
    emitter({ ...extras, ...event, provider: driver.name });
  }

  /** Applies a per-code message override (`options.messages`), if configured. */
  function applyMessageOverride(error: PaymentValidationError): PaymentValidationError {
    const override = getOptions().messages?.[error.code];
    return override ? { ...error, message: override } : error;
  }

  /**
   * Resolves a user-facing message for a caught technical error (SDK load
   * failure, network error, thrown SDK exception...). Tries the caller's
   * `resolveErrorMessage` first, then falls back to `parseError`'s built-in
   * translations.
   */
  function resolveGenericErrorMessage(error: unknown): string {
    const custom = getOptions().resolveErrorMessage?.(error);
    return custom !== undefined ? custom : parseError(error);
  }

  function handleSuccess(raw: TRaw, config?: TConfig) {
    const options = getOptions();
    const log = getLog();
    const resolvedConfig = config ?? (lastConfig as TConfig);
    const mode: "mock" | "live" = options.isMockMode ? "mock" : "live";

    log.success("Payment completed by provider", raw);

    const payload = driver.toVerifyPayload(raw, resolvedConfig);
    const status = driver.getStatus?.(raw);
    const verifyUrl = options.verification?.verifyUrl;

    if (!verifyUrl) {
      emit(
        { name: "payment_completed", amount: payload.amount, mode, transactionId: payload.transactionId, status },
        resolvedConfig
      );
      options.onRawSuccess?.(raw);
      return;
    }

    setState({ isVerifying: true });
    log.info("🔐 Verifying transaction with backend...", { url: verifyUrl });
    emit(
      { name: "payment_verification_started", amount: payload.amount, mode, transactionId: payload.transactionId },
      resolvedConfig
    );

    verifyTransaction(
      {
        verifyUrl,
        verifyMethod: options.verification?.verifyMethod,
        customVerifyHeaders: options.verification?.customVerifyHeaders,
      },
      {
        transactionId: payload.transactionId,
        amount: payload.amount,
        provider: driver.name,
        metadata: payload.metadata,
      }
    )
      .then((verifyResult) => {
        setState({ isVerifying: false });
        log.success("🔐 Backend verification successful", verifyResult);
        emit(
          { name: "payment_verification_succeeded", amount: payload.amount, mode, transactionId: payload.transactionId },
          resolvedConfig
        );
        emit(
          { name: "payment_completed", amount: payload.amount, mode, transactionId: payload.transactionId, status },
          resolvedConfig
        );
        options.onRawSuccess?.(raw);
      })
      .catch((err) => {
        setState({ isVerifying: false });
        const verifyError = err instanceof Error ? err : new Error("Verification failed");
        log.error("🔐 Backend verification failed", verifyError);
        emit(
          {
            name: "payment_verification_failed",
            amount: payload.amount,
            mode,
            transactionId: payload.transactionId,
            errorMessage: verifyError.message,
          },
          resolvedConfig
        );
        // A message your own verifyUrl endpoint wrote is shown exactly as you
        // wrote it — only messages WE generated (network failures, a bare
        // HTTP status with no body) go through translation/resolution.
        const userMessage =
          verifyError instanceof VerificationError && verifyError.isBackendMessage
            ? verifyError.message
            : resolveGenericErrorMessage(verifyError);
        options.onValidationError?.(applyMessageOverride({ code: "SDK_ERROR", message: userMessage }));
      });
  }

  function start(): () => void {
    const options = getOptions();
    const log = getLog();

    if (options.isMockMode) {
      log.info("🧪 Running in Mock Mode - No real SDK loaded");
      setState({ scriptLoaded: true, loading: false });
      return () => {
        destroyed = true;
      };
    }

    let cancelled = false;
    const analyticsConfig = options.getAnalyticsConfig?.();

    log.info(`Loading ${driver.name} SDK...`);
    emit({ name: "sdk_load_started", mode: "live", amount: driver.getAmount(analyticsConfig) }, analyticsConfig);

    loadScript(driver.scriptUrl, driver.scriptId)
      .then(() => {
        if (cancelled) return;
        setState({ scriptLoaded: true, loading: false });
        log.success(`${driver.name} SDK loaded successfully`);
        emit(
          { name: "sdk_load_succeeded", mode: "live", amount: driver.getAmount(analyticsConfig) },
          analyticsConfig
        );
      })
      .catch((err) => {
        if (cancelled) return;
        const friendlyMessage = resolveGenericErrorMessage(err);
        setState({ error: new Error(friendlyMessage), loading: false });
        log.error(`Failed to load ${driver.name} SDK`, err);
        emit(
          {
            name: "sdk_load_failed",
            mode: "live",
            amount: driver.getAmount(analyticsConfig),
            errorMessage: friendlyMessage,
          },
          analyticsConfig
        );
      });

    return () => {
      cancelled = true;
      destroyed = true;
    };
  }

  async function runOpen(config: TConfig) {
    const options = getOptions();
    const log = getLog();
    const isMockMode = options.isMockMode;
    const mode: "mock" | "live" = isMockMode ? "mock" : "live";

    if (state.isPreparing) {
      log.warn("Payment pre-validation already in progress");
      return;
    }

    log.info(`Opening ${driver.name} dialog...`, { config, isMockMode });

    driver.logEnvironmentWarnings?.(config, { isMockMode, environmentWarnings: options.environmentWarnings });

    const validationError = driver.validate(config, { isMockMode });
    if (validationError) {
      log.error(`Validation failed: ${validationError.message}`);
      emit(
        {
          name: "payment_validation_failed",
          amount: driver.getAmount(config),
          mode,
          errorCode: validationError.code,
          errorMessage: validationError.message,
        },
        config
      );
      options.onValidationError?.(applyMessageOverride(validationError));
      return;
    }

    emit({ name: "payment_open_attempted", amount: driver.getAmount(config), mode }, config);

    if (options.onBeforePayment) {
      try {
        setState({ isPreparing: true });
        emit({ name: "payment_pre_validation_started", amount: driver.getAmount(config), mode }, config);
        const shouldContinue = await options.onBeforePayment();
        if (shouldContinue === false) {
          log.info("Payment opening cancelled by onBeforePayment");
          emit({ name: "payment_pre_validation_cancelled", amount: driver.getAmount(config), mode }, config);
          return;
        }
        emit({ name: "payment_pre_validation_succeeded", amount: driver.getAmount(config), mode }, config);
      } catch (err) {
        const preValidationError = err instanceof Error ? err : new Error("Payment pre-validation failed");
        setState({ error: preValidationError });
        log.error("onBeforePayment failed", preValidationError);
        emit(
          {
            name: "payment_pre_validation_failed",
            amount: driver.getAmount(config),
            mode,
            errorMessage: preValidationError.message,
          },
          config
        );
        options.onValidationError?.(
          applyMessageOverride({ code: "PRE_VALIDATION_FAILED", message: preValidationError.message })
        );
        return;
      } finally {
        setState({ isPreparing: false });
      }
    }

    if (isMockMode) {
      log.info("🧪 Simulating payment...");
      emit({ name: "payment_opened", amount: driver.getAmount(config), mode: "mock" }, config);
      setTimeout(() => {
        const mockResponse = driver.buildMockSuccess(config);
        log.success("🧪 Mock Payment Successful", mockResponse);
        handleSuccess(mockResponse, config);
      }, 1000);
      return;
    }

    if (!state.scriptLoaded || !driver.isSdkReady()) {
      const validationError = {
        code: "SDK_NOT_LOADED" as const,
        message: `${driver.name} SDK not loaded. Please wait for the script to load.`,
      };
      log.error("SDK not loaded. Cannot open dialog.");
      emit(
        {
          name: "payment_validation_failed",
          amount: driver.getAmount(config),
          mode: "live",
          errorCode: validationError.code,
          errorMessage: validationError.message,
        },
        config
      );
      options.onValidationError?.(applyMessageOverride(validationError));
      return;
    }

    try {
      driver.open(
        config,
        {
          onSuccess: (raw) => handleSuccess(raw, config),
          onFailure: (raw) => getOptions().onRawFailure?.(raw),
          onClose: () => getOptions().onClose?.(),
        },
        {
          log,
          isMockMode,
          emit: (partial) => emit({ amount: driver.getAmount(config), mode: "live", ...partial }, config),
        }
      );

      log.success(`${driver.name} dialog opened successfully`);
      emit({ name: "payment_opened", amount: driver.getAmount(config), mode: "live" }, config);
    } catch (err) {
      log.error(`Failed to open ${driver.name} dialog`, err);
      const sdkError = err instanceof Error ? err : new Error(`Failed to open ${driver.name} dialog`);
      setState({ error: sdkError });
      emit(
        {
          name: "payment_failed",
          amount: driver.getAmount(config),
          mode: "live",
          errorCode: "SDK_ERROR",
          errorMessage: sdkError.message,
        },
        config
      );
      options.onValidationError?.(
        applyMessageOverride({ code: "SDK_ERROR", message: resolveGenericErrorMessage(sdkError) })
      );
    }
  }

  function open(config: TConfig) {
    lastConfig = config;
    void runOpen(config);
  }

  return { getState, subscribe, start, open };
}
