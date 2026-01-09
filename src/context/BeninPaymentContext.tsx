"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Currency } from "../types";

/**
 * Global configuration for Benin Payment providers.
 */
export interface BeninPaymentConfig {
  /** 
   * Default FedaPay public key.
   * Will be used if no key is provided at the component level.
   * @example "pk_live_xxxxxxxxxxxx"
   */
  fedaPayPublicKey?: string;
  /** 
   * Default KKiaPay public key.
   * Will be used if no key is provided at the component level.
   * @example "pk_xxxxxxxxxxxx"
   */
  kkiaPayPublicKey?: string;
  /** 
   * Default currency for all transactions.
   * @default "XOF"
   */
  defaultCurrency?: Currency;
  /** 
   * Force sandbox/test mode globally.
   * When true, all transactions will be in test mode.
   * @default false
   */
  isTestMode?: boolean;
  /** 
   * Enable debug mode globally.
   * Shows console logs for all payment operations.
   * @default false
   */
  debug?: boolean;
}

/**
 * Internal context value with resolved defaults.
 */
interface BeninPaymentContextValue {
  fedaPayPublicKey: string | undefined;
  kkiaPayPublicKey: string | undefined;
  defaultCurrency: Currency;
  isTestMode: boolean;
  debug: boolean;
  isProviderMounted: boolean;
}

const BeninPaymentContext = createContext<BeninPaymentContextValue | null>(null);

/**
 * Props for the BeninPaymentProvider component.
 */
export interface BeninPaymentProviderProps extends BeninPaymentConfig {
  /** Child components that will have access to the payment context */
  children: ReactNode;
}

/**
 * Global provider for Benin Payment configuration.
 * 
 * Wrap your application (or a section of it) with this provider to set
 * default values for all FedaPay and KKiaPay hooks and components.
 * 
 * @example
 * ```tsx
 * import { BeninPaymentProvider } from "react-benin-payments";
 * 
 * function App() {
 *   return (
 *     <BeninPaymentProvider
 *       fedaPayPublicKey="pk_live_xxxxxxxxxxxx"
 *       kkiaPayPublicKey="pk_xxxxxxxxxxxx"
 *       defaultCurrency="XOF"
 *       isTestMode={process.env.NODE_ENV === "development"}
 *       debug={true}
 *     >
 *       <YourApp />
 *     </BeninPaymentProvider>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Components inside the provider can now use hooks without passing keys
 * function PaymentButton() {
 *   const { openDialog, loading } = useFedaPay({
 *     transaction: { amount: 5000 }
 *     // No need for public_key - it's taken from the provider!
 *   });
 * 
 *   return <button onClick={openDialog}>Pay</button>;
 * }
 * ```
 */
export function BeninPaymentProvider({
  fedaPayPublicKey,
  kkiaPayPublicKey,
  defaultCurrency = "XOF",
  isTestMode = false,
  debug = false,
  children,
}: BeninPaymentProviderProps) {
  const value = useMemo<BeninPaymentContextValue>(
    () => ({
      fedaPayPublicKey,
      kkiaPayPublicKey,
      defaultCurrency,
      isTestMode,
      debug,
      isProviderMounted: true,
    }),
    [fedaPayPublicKey, kkiaPayPublicKey, defaultCurrency, isTestMode, debug]
  );

  return (
    <BeninPaymentContext.Provider value={value}>
      {children}
    </BeninPaymentContext.Provider>
  );
}

/**
 * Hook to access the global Benin Payment configuration.
 * 
 * Returns the configuration from the nearest BeninPaymentProvider,
 * or default values if no provider is found.
 * 
 * @returns The current payment configuration
 * 
 * @example
 * ```tsx
 * function PaymentStatus() {
 *   const { isTestMode, defaultCurrency, debug } = useBeninConfig();
 *   
 *   return (
 *     <div>
 *       Mode: {isTestMode ? "Test" : "Production"}
 *       Currency: {defaultCurrency}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBeninConfig(): BeninPaymentContextValue {
  const context = useContext(BeninPaymentContext);
  
  if (!context) {
    return {
      fedaPayPublicKey: undefined,
      kkiaPayPublicKey: undefined,
      defaultCurrency: "XOF",
      isTestMode: false,
      debug: false,
      isProviderMounted: false,
    };
  }
  
  return context;
}

/**
 * Hook to check if the app is wrapped with BeninPaymentProvider.
 * 
 * @returns true if provider is mounted, false otherwise
 */
export function useIsBeninProviderMounted(): boolean {
  const context = useContext(BeninPaymentContext);
  return context?.isProviderMounted ?? false;
}
