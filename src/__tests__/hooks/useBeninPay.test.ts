import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBeninPay } from "../../hooks/useBeninPay";

describe("useBeninPay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("sélection du provider", () => {
    it("retourne provider=fedapay quand spécifié", () => {
      const { result } = renderHook(() =>
        useBeninPay(
          { provider: "fedapay", fedapay: { transaction: { amount: 5000 } } },
          { mock: true }
        )
      );

      expect(result.current.provider).toBe("fedapay");
    });

    it("retourne provider=kkiapay quand spécifié", () => {
      const { result } = renderHook(() =>
        useBeninPay(
          { provider: "kkiapay", kkiapay: { amount: 5000 } },
          { mock: true }
        )
      );

      expect(result.current.provider).toBe("kkiapay");
    });
  });

  describe("état initial en mode mock", () => {
    it("isReady=true en mode mock (fedapay)", () => {
      const { result } = renderHook(() =>
        useBeninPay(
          { provider: "fedapay", fedapay: { transaction: { amount: 5000 } } },
          { mock: true }
        )
      );

      expect(result.current.isReady).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.isMockMode).toBe(true);
      expect(result.current.lastTransaction).toBeNull();
    });

    it("isReady=true en mode mock (kkiapay)", () => {
      const { result } = renderHook(() =>
        useBeninPay(
          { provider: "kkiapay", kkiapay: { amount: 5000 } },
          { mock: true }
        )
      );

      expect(result.current.isReady).toBe(true);
      expect(result.current.lastTransaction).toBeNull();
    });
  });

  describe("paiement FedaPay unifié", () => {
    it("appelle onSuccess avec un résultat unifié", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useBeninPay(
          {
            provider: "fedapay",
            fedapay: { transaction: { amount: 5000 } },
          },
          { mock: true, onSuccess }
        )
      );

      await act(async () => {
        result.current.pay();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          status: "success",
          transactionId: expect.any(String),
          rawResponse: expect.any(Object),
        })
      );
      expect(result.current.lastTransaction).toEqual(
        expect.objectContaining({
          amount: 5000,
          status: "success",
          transactionId: expect.any(String),
          rawResponse: expect.any(Object),
        })
      );
    });
  });

  describe("paiement KKiaPay unifié", () => {
    it("appelle onSuccess avec un résultat unifié", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useBeninPay(
          {
            provider: "kkiapay",
            kkiapay: { amount: 5000 },
          },
          { mock: true, onSuccess }
        )
      );

      await act(async () => {
        result.current.pay();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          status: "success",
          transactionId: expect.any(String),
        })
      );
      expect(result.current.lastTransaction).toEqual(
        expect.objectContaining({
          amount: 5000,
          status: "success",
          transactionId: expect.any(String),
        })
      );
    });
  });

  describe("pré-validation avant paiement", () => {
    it("attend onBeforePayment avant un paiement unifié", async () => {
      const order: string[] = [];
      const onSuccess = vi.fn(() => {
        order.push("success");
      });
      const onBeforePayment = vi.fn().mockImplementation(async () => {
        order.push("before:start");
        await Promise.resolve();
        order.push("before:end");
      });

      const { result } = renderHook(() =>
        useBeninPay(
          {
            provider: "fedapay",
            fedapay: { transaction: { amount: 5000 } },
          },
          { mock: true, onSuccess, onBeforePayment }
        )
      );

      await act(async () => {
        result.current.pay();
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onBeforePayment).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["before:start", "before:end", "success"]);
    });
  });

  describe("analytics", () => {
    it("propage les événements analytics via useBeninPay", async () => {
      const onAnalyticsEvent = vi.fn();
      const { result } = renderHook(() =>
        useBeninPay(
          {
            provider: "kkiapay",
            kkiapay: { amount: 5000 },
          },
          { mock: true, onAnalyticsEvent }
        )
      );

      await act(async () => {
        result.current.pay();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "payment_completed",
          provider: "kkiapay",
          amount: 5000,
        })
      );
    });
  });

  describe("gestion des erreurs", () => {
    it("propage onError pour fedapay", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useBeninPay(
          {
            provider: "fedapay",
            fedapay: { transaction: { amount: 0 } },
          },
          { mock: true, onError }
        )
      );

      act(() => {
        result.current.pay();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });

    it("propage onError pour kkiapay", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useBeninPay(
          {
            provider: "kkiapay",
            kkiapay: { amount: 0 },
          },
          { mock: true, onError }
        )
      );

      act(() => {
        result.current.pay();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });
  });
});
