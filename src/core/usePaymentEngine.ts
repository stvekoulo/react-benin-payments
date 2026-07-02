"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPaymentEngine } from "./createPaymentEngine";
import type { PaymentDriver, PaymentEngineOptions, PaymentEngineState } from "./types";

/**
 * React binding for `createPaymentEngine`. Owns one engine instance per
 * hook call (recreated only if the driver or mock-mode flag changes),
 * subscribes to its state, and starts its background lifecycle
 * (script loading, persistent SDK listeners) for the component's lifetime.
 *
 * `getOptions` is called fresh on every render, so callbacks and config
 * values it returns are always up to date without needing to be listed in
 * any dependency array.
 */
export function usePaymentEngine<TConfig, TRaw>(
  driver: PaymentDriver<TConfig, TRaw>,
  getOptions: () => PaymentEngineOptions<TConfig, TRaw>
): [PaymentEngineState, (config: TConfig) => void] {
  const getOptionsRef = useRef(getOptions);
  getOptionsRef.current = getOptions;

  const isMockMode = getOptions().isMockMode;

  const engine = useMemo(
    () => createPaymentEngine(driver, () => getOptionsRef.current()),
    // Recreated only when the driver identity or the mock flag changes —
    // mirrors the original hooks re-running their script-loading effect then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [driver, isMockMode]
  );

  const [state, setState] = useState<PaymentEngineState>(() => engine.getState());

  useEffect(() => {
    setState(engine.getState());
    const unsubscribe = engine.subscribe(() => setState(engine.getState()));
    const stop = engine.start();
    return () => {
      unsubscribe();
      stop();
    };
  }, [engine]);

  return [state, engine.open];
}
