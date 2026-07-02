import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKkiaPay } from "../../hooks/useKkiaPay";

describe("useKkiaPay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("état initial en mode mock", () => {
    it("scriptLoaded=true et loading=false dès le mount", () => {
      const { result } = renderHook(() => useKkiaPay({ mock: true }));

      expect(result.current.scriptLoaded).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.isMockMode).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("validation", () => {
    it("appelle onValidationError si la clé est manquante (mode réel)", () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: false, onValidationError })
      );

      act(() => {
        result.current.openKkiapay({ amount: 5000 });
      });

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "MISSING_PUBLIC_KEY" })
      );
    });

    it("appelle onValidationError si le montant est 0", () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, onValidationError })
      );

      act(() => {
        result.current.openKkiapay({ amount: 0 });
      });

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });

    it("appelle onValidationError si le montant est négatif", () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, onValidationError })
      );

      act(() => {
        result.current.openKkiapay({ amount: -100 });
      });

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });
  });

  describe("simulation de paiement (mock mode)", () => {
    it("émet des événements analytics standardisés", async () => {
      const onAnalyticsEvent = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, onAnalyticsEvent })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "payment_open_attempted",
          provider: "kkiapay",
          amount: 5000,
          mode: "mock",
          timestamp: expect.any(String),
        })
      );
      expect(onAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "payment_completed",
          provider: "kkiapay",
          amount: 5000,
          transactionId: expect.any(String),
          mode: "mock",
          timestamp: expect.any(String),
        })
      );
    });

    it("attend onBeforePayment avant d'ouvrir le paiement", async () => {
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
        useKkiaPay({ mock: true, onSuccess, onBeforePayment })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onBeforePayment).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["before:start", "before:end", "success"]);
    });

    it("annule l'ouverture si onBeforePayment retourne false", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({
          mock: true,
          onSuccess,
          onBeforePayment: vi.fn().mockResolvedValue(false),
        })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("propage une erreur si onBeforePayment échoue", async () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({
          mock: true,
          onValidationError,
          onBeforePayment: vi.fn().mockRejectedValue(new Error("Stock indisponible")),
        })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await Promise.resolve();
      });

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "PRE_VALIDATION_FAILED",
          message: "Stock indisponible",
        })
      );
    });

    it("appelle onSuccess après 1 seconde", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, onSuccess })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("le résultat mock contient le bon montant", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, onSuccess })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 3000 });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3000 })
      );
    });

    it("le résultat mock contient un transactionId", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, onSuccess })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: expect.stringMatching(/^mock_tx_/),
        })
      );
    });

    it("utilise le numéro de téléphone fourni dans le résultat mock", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, onSuccess })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000, phone: "22961000000" });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "22961000000" })
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

      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({ mock: true, verifyUrl: "/api/verify", onSuccess })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000, key: "pk_test" });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/verify",
        expect.objectContaining({ method: "POST" })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("appelle onValidationError si la vérification backend échoue", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Échec de vérification" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({
          mock: true,
          verifyUrl: "/api/verify",
          onValidationError,
        })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "SDK_ERROR" })
      );
    });
  });

  describe("contrôle des messages (i18n)", () => {
    it("applique un message personnalisé via messages", () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({
          mock: true,
          onValidationError,
          messages: { INVALID_AMOUNT: "Montant KKiaPay invalide." },
        })
      );

      act(() => {
        result.current.openKkiapay({ amount: 0 });
      });

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT", message: "Montant KKiaPay invalide." })
      );
    });

    it("resolveErrorMessage personnalisé remplace la traduction par défaut", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
      );

      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useKkiaPay({
          mock: true,
          verifyUrl: "/api/verify",
          onValidationError,
          resolveErrorMessage: () => "Custom message.",
        })
      );

      await act(async () => {
        result.current.openKkiapay({ amount: 5000 });
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "SDK_ERROR", message: "Custom message." })
      );
    });
  });
});
