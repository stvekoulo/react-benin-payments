/**
 * Validates API key consistency with sandbox mode.
 * Warns developers about potential misconfigurations.
 * 
 * @param key - The API public key
 * @param sandbox - Whether sandbox mode is enabled
 * @param provider - The payment provider name (for logging)
 */
export function validateKeyEnvironment(
  key: string,
  sandbox: boolean,
  provider: "FedaPay" | "KKiaPay"
): void {
  if (!key) return;

  const isLiveKey = key.startsWith("pk_live_") || key.startsWith("pk_live");
  const isTestKey =
    key.startsWith("pk_test_") ||
    key.startsWith("pk_sandbox_") ||
    key.startsWith("pk_sandbox");

  if (sandbox && isLiveKey) {
    console.warn(
      `⚠️ [react-benin-payments] ${provider}: You are in Sandbox mode but using a LIVE key! This may cause unexpected charges.`
    );
  }

  if (!sandbox && isTestKey) {
    console.warn(
      `⚠️ [react-benin-payments] ${provider}: You are in Production mode but using a TEST key! Payments will not be processed.`
    );
  }
}

/**
 * Logs sandbox mode warning if enabled.
 * 
 * @param sandbox - Whether sandbox mode is enabled
 * @param provider - The payment provider name
 */
export function logSandboxMode(
  sandbox: boolean,
  provider: "FedaPay" | "KKiaPay"
): void {
  if (sandbox) {
    console.log(
      `⚠️ [react-benin-payments] ${provider}: Running in Sandbox Mode - No real transactions will be processed.`
    );
  }
}
