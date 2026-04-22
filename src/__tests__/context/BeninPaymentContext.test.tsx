import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import {
  BeninPaymentProvider,
  useBeninConfig,
  useIsBeninProviderMounted,
} from "../../context/BeninPaymentContext";

describe("useBeninConfig sans provider", () => {
  it("retourne les valeurs par défaut", () => {
    const { result } = renderHook(() => useBeninConfig());

    expect(result.current.defaultCurrency).toBe("XOF");
    expect(result.current.isTestMode).toBe(false);
    expect(result.current.debug).toBe(false);
    expect(result.current.fedaPayPublicKey).toBeUndefined();
    expect(result.current.kkiaPayPublicKey).toBeUndefined();
    expect(result.current.isProviderMounted).toBe(false);
  });
});

describe("useBeninConfig avec provider", () => {
  it("retourne les valeurs configurées", () => {
    const onAnalyticsEvent = () => undefined;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BeninPaymentProvider
        fedaPayPublicKey="pk_live_test"
        kkiaPayPublicKey="pk_test_kkia"
        defaultCurrency="EUR"
        isTestMode={true}
        debug={true}
        onAnalyticsEvent={onAnalyticsEvent}
      >
        {children}
      </BeninPaymentProvider>
    );

    const { result } = renderHook(() => useBeninConfig(), { wrapper });

    expect(result.current.fedaPayPublicKey).toBe("pk_live_test");
    expect(result.current.kkiaPayPublicKey).toBe("pk_test_kkia");
    expect(result.current.defaultCurrency).toBe("EUR");
    expect(result.current.isTestMode).toBe(true);
    expect(result.current.debug).toBe(true);
    expect(result.current.onAnalyticsEvent).toBe(onAnalyticsEvent);
    expect(result.current.isProviderMounted).toBe(true);
  });

  it("retourne XOF par défaut si currency non spécifiée", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BeninPaymentProvider>{children}</BeninPaymentProvider>
    );

    const { result } = renderHook(() => useBeninConfig(), { wrapper });

    expect(result.current.defaultCurrency).toBe("XOF");
  });

  it("isTestMode=false par défaut", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BeninPaymentProvider>{children}</BeninPaymentProvider>
    );

    const { result } = renderHook(() => useBeninConfig(), { wrapper });

    expect(result.current.isTestMode).toBe(false);
  });
});

describe("useIsBeninProviderMounted", () => {
  it("retourne false sans provider", () => {
    const { result } = renderHook(() => useIsBeninProviderMounted());
    expect(result.current).toBe(false);
  });

  it("retourne true avec provider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BeninPaymentProvider>{children}</BeninPaymentProvider>
    );

    const { result } = renderHook(() => useIsBeninProviderMounted(), {
      wrapper,
    });

    expect(result.current).toBe(true);
  });
});
