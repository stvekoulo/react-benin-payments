import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFedaPay } from "../../hooks/useFedaPay";
import React from "react";
import { BeninPaymentProvider } from "../../context";

describe("useFedaPay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("état initial en mode mock", () => {
    it("scriptLoaded=true et loading=false dès le mount", () => {
      const { result } = renderHook(() =>
        useFedaPay(
          { public_key: "pk_live_test", transaction: { amount: 5000 } },
          { mock: true }
        )
      );

      expect(result.current.scriptLoaded).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.isMockMode).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("validation", () => {
    it("appelle onError si la clé publique est manquante (mode réel)", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay({ transaction: { amount: 5000 } }, { mock: false, onError })
      );

      act(() => {
        result.current.openDialog();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "MISSING_PUBLIC_KEY" })
      );
    });

    it("appelle onError si le montant est 0", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay({ transaction: { amount: 0 } }, { mock: true, onError })
      );

      act(() => {
        result.current.openDialog();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });

    it("appelle onError si le montant est négatif", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay({ transaction: { amount: -500 } }, { mock: true, onError })
      );

      act(() => {
        result.current.openDialog();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });
  });

  describe("simulation de paiement (mock mode)", () => {
    it("émet des événements analytics standardisés", async () => {
      const onAnalyticsEvent = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay(
          {
            public_key: "pk_live_test",
            transaction: { amount: 5000 },
          },
          { mock: true, onAnalyticsEvent }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "payment_open_attempted",
          provider: "fedapay",
          amount: 5000,
          mode: "mock",
          timestamp: expect.any(String),
        })
      );
      expect(onAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "payment_completed",
          provider: "fedapay",
          amount: 5000,
          transactionId: expect.any(String),
          mode: "mock",
          timestamp: expect.any(String),
        })
      );
    });

    it("utilise le handler analytics du provider", async () => {
      const onAnalyticsEvent = vi.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          BeninPaymentProvider as React.ComponentType<{
            onAnalyticsEvent: typeof onAnalyticsEvent;
            children?: React.ReactNode;
          }>,
          { onAnalyticsEvent },
          children
        );

      const { result } = renderHook(
        () =>
          useFedaPay(
            {
              public_key: "pk_live_test",
              transaction: { amount: 5000 },
            },
            { mock: true }
          ),
        { wrapper }
      );

      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "payment_completed",
          provider: "fedapay",
        })
      );
    });

    it("attend onBeforePayment avant d'ouvrir le paiement", async () => {
      const order: string[] = [];
      const onComplete = vi.fn(() => {
        order.push("complete");
      });
      const onBeforePayment = vi.fn().mockImplementation(async () => {
        order.push("before:start");
        await Promise.resolve();
        order.push("before:end");
      });

      const { result } = renderHook(() =>
        useFedaPay(
          {
            public_key: "pk_live_test",
            transaction: { amount: 5000 },
            onComplete,
          },
          { mock: true, onBeforePayment }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onBeforePayment).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["before:start", "before:end", "complete"]);
    });

    it("annule l'ouverture si onBeforePayment retourne false", async () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay(
          {
            public_key: "pk_live_test",
            transaction: { amount: 5000 },
            onComplete,
          },
          { mock: true, onBeforePayment: vi.fn().mockResolvedValue(false) }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it("propage une erreur si onBeforePayment échoue", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay(
          { transaction: { amount: 5000 } },
          {
            mock: true,
            onError,
            onBeforePayment: vi.fn().mockRejectedValue(new Error("Stock indisponible")),
          }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await Promise.resolve();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "PRE_VALIDATION_FAILED",
          message: "Stock indisponible",
        })
      );
    });

    it("appelle onComplete après 1 seconde", async () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay(
          {
            public_key: "pk_live_test",
            transaction: { amount: 5000 },
            onComplete,
          },
          { mock: true }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("le résultat mock contient le bon montant", async () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay(
          {
            transaction: { amount: 7500 },
            onComplete,
          },
          { mock: true }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: expect.objectContaining({ amount: 7500 }),
        })
      );
    });

    it("le statut mock est approved", async () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay({ transaction: { amount: 5000 }, onComplete }, { mock: true })
      );

      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: expect.objectContaining({ status: "approved" }),
        })
      );
    });
  });

  describe("vérification backend", () => {
    it("appelle verifyUrl après un paiement réussi", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay(
          {
            transaction: { amount: 5000 },
            verifyUrl: "/api/verify",
            onComplete,
          },
          { mock: true }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/verify",
        expect.objectContaining({ method: "POST" })
      );
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("appelle onError si la vérification backend échoue", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Vérification échouée" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useFedaPay(
          { transaction: { amount: 5000 }, verifyUrl: "/api/verify" },
          { mock: true, onError }
        )
      );

      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "SDK_ERROR" })
      );
    });

    it("isVerifying est true pendant la vérification", async () => {
      let resolveFetch!: (value: unknown) => void;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(
          () =>
            new Promise((res) => {
              resolveFetch = res;
            })
        )
      );

      const { result } = renderHook(() =>
        useFedaPay(
          { transaction: { amount: 5000 }, verifyUrl: "/api/verify" },
          { mock: true }
        )
      );

      // Déclencher le paiement mock — le fetch reste en suspens
      await act(async () => {
        result.current.openDialog();
        await vi.advanceTimersByTimeAsync(1000);
      });

      // setIsVerifying(true) est appelé synchroniquement avant l'await fetch
      expect(result.current.isVerifying).toBe(true);

      // Résoudre le fetch pour nettoyer correctement
      await act(async () => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });
    });
  });
});
