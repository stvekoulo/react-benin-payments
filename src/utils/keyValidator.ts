/**
 * Overrides the wording of the dev-time console warnings emitted by
 * `validateKeyEnvironment`/`logSandboxMode`. Every field is optional — any
 * warning you don't override keeps its default English text.
 */
export interface EnvironmentWarningMessages {
  /** Shown when a live key is used while sandbox mode is on. Receives the provider name (e.g. "FedaPay"). */
  liveKeyInSandbox?: (provider: string) => string;
  /** Shown when a test/sandbox key is used while sandbox mode is off. Receives the provider name. */
  testKeyInProduction?: (provider: string) => string;
  /** Shown once whenever sandbox mode is active. Receives the provider name. */
  sandboxModeActive?: (provider: string) => string;
}

/**
 * Validates API key consistency with sandbox mode.
 * Warns developers about potential misconfigurations.
 *
 * @param key - The API public key
 * @param sandbox - Whether sandbox mode is enabled
 * @param provider - The payment provider name (for logging)
 * @param messages - Optional overrides for the warning text
 */
export function validateKeyEnvironment(
  key: string,
  sandbox: boolean,
  provider: "FedaPay" | "KKiaPay",
  messages?: EnvironmentWarningMessages
): void {
  if (!key) return;

  const isLiveKey = key.startsWith("pk_live_") || key.startsWith("pk_live");
  const isTestKey =
    key.startsWith("pk_test_") ||
    key.startsWith("pk_sandbox_") ||
    key.startsWith("pk_sandbox");

  if (sandbox && isLiveKey) {
    console.warn(
      messages?.liveKeyInSandbox?.(provider) ??
        `⚠️ [react-benin-payments] ${provider}: You are in Sandbox mode but using a LIVE key! This may cause unexpected charges.`
    );
  }

  if (!sandbox && isTestKey) {
    console.warn(
      messages?.testKeyInProduction?.(provider) ??
        `⚠️ [react-benin-payments] ${provider}: You are in Production mode but using a TEST key! Payments will not be processed.`
    );
  }
}

/**
 * Logs sandbox mode warning if enabled.
 *
 * @param sandbox - Whether sandbox mode is enabled
 * @param provider - The payment provider name
 * @param messages - Optional overrides for the warning text
 */
export function logSandboxMode(
  sandbox: boolean,
  provider: "FedaPay" | "KKiaPay",
  messages?: EnvironmentWarningMessages
): void {
  if (sandbox) {
    console.log(
      messages?.sandboxModeActive?.(provider) ??
        `⚠️ [react-benin-payments] ${provider}: Running in Sandbox Mode - No real transactions will be processed.`
    );
  }
}
