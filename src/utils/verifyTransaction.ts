import type { VerificationConfig, VerificationResponse, VerifyMethod } from "../types";

/**
 * Payload sent to the verification endpoint.
 */
export interface VerifyPayload {
  /** Transaction ID from the payment provider */
  transactionId: string;
  /** Amount that was charged */
  amount: number;
  /** Payment provider used */
  provider: "fedapay" | "kkiapay";
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Verifies a transaction with the backend.
 * 
 * @param config - Verification configuration
 * @param payload - Transaction data to verify
 * @returns Verification response from the backend
 * @throws Error if verification fails or network error occurs
 * 
 * @example
 * ```ts
 * const result = await verifyTransaction(
 *   { verifyUrl: "/api/verify", verifyMethod: "POST" },
 *   { transactionId: "tx_123", amount: 5000, provider: "fedapay" }
 * );
 * ```
 */
export async function verifyTransaction(
  config: VerificationConfig,
  payload: VerifyPayload
): Promise<VerificationResponse> {
  if (!config.verifyUrl) {
    throw new Error("verifyUrl is required for transaction verification");
  }

  const method: VerifyMethod = config.verifyMethod ?? "POST";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.customVerifyHeaders,
  };

  let url = config.verifyUrl;
  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (method === "POST") {
    fetchOptions.body = JSON.stringify(payload);
  } else {
    const params = new URLSearchParams({
      transactionId: payload.transactionId,
      amount: payload.amount.toString(),
      provider: payload.provider,
    });
    url = `${config.verifyUrl}?${params.toString()}`;
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let errorMessage = `Verification failed with status ${response.status}`;
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Response is not JSON, use default message
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  return {
    success: data.success ?? true,
    message: data.message,
    data: data.data ?? data,
  };
}
