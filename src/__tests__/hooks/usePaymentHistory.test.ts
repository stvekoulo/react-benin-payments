import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePaymentHistory } from "../../hooks/usePaymentHistory";
import type { UnifiedPaymentResult } from "../../hooks/useBeninPay";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<UnifiedPaymentResult> = {}): UnifiedPaymentResult {
  return {
    transactionId: `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    amount: 5000,
    status: "success",
    rawResponse: {} as UnifiedPaymentResult["rawResponse"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("usePaymentHistory", () => {
  beforeEach(() => {
    // Clear storage between tests
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- initial state -------------------------------------------------------

  describe("état initial", () => {
    it("démarre avec un historique vide (memory)", () => {
      const { result } = renderHook(() => usePaymentHistory());

      expect(result.current.history).toEqual([]);
      expect(result.current.lastTransaction).toBeNull();
      expect(result.current.totalPaid).toBe(0);
      expect(result.current.count).toBe(0);
    });

    it("recharge l'historique depuis sessionStorage au montage", () => {
      const entry = { ...makeResult(), provider: "fedapay" as const, recordedAt: new Date().toISOString() };
      sessionStorage.setItem("rbp_payment_history", JSON.stringify([entry]));

      const { result } = renderHook(() =>
        usePaymentHistory({ storage: "session" })
      );

      expect(result.current.count).toBe(1);
      expect(result.current.history[0].transactionId).toBe(entry.transactionId);
    });

    it("recharge l'historique depuis localStorage au montage", () => {
      const entry = { ...makeResult(), provider: "kkiapay" as const, recordedAt: new Date().toISOString() };
      localStorage.setItem("rbp_payment_history", JSON.stringify([entry]));

      const { result } = renderHook(() =>
        usePaymentHistory({ storage: "local" })
      );

      expect(result.current.count).toBe(1);
    });

    it("retourne [] si sessionStorage contient du JSON invalide", () => {
      sessionStorage.setItem("rbp_payment_history", "invalid-json{");

      const { result } = renderHook(() =>
        usePaymentHistory({ storage: "session" })
      );

      expect(result.current.history).toEqual([]);
    });
  });

  // ---- addToHistory --------------------------------------------------------

  describe("addToHistory", () => {
    it("ajoute une entrée en tête de liste avec recordedAt", () => {
      const { result } = renderHook(() => usePaymentHistory());
      const payment = makeResult({ amount: 3000 });

      act(() => {
        result.current.addToHistory(payment, "fedapay");
      });

      expect(result.current.count).toBe(1);
      expect(result.current.history[0].amount).toBe(3000);
      expect(result.current.history[0].provider).toBe("fedapay");
      expect(result.current.history[0].recordedAt).toBeDefined();
    });

    it("le plus récent paiement est toujours en première position", () => {
      const { result } = renderHook(() => usePaymentHistory());

      act(() => { result.current.addToHistory(makeResult({ amount: 1000 })); });
      act(() => { result.current.addToHistory(makeResult({ amount: 9000 })); });

      expect(result.current.history[0].amount).toBe(9000);
      expect(result.current.history[1].amount).toBe(1000);
    });

    it("déduplique : ignore un transactionId déjà présent", () => {
      const { result } = renderHook(() => usePaymentHistory());
      const payment = makeResult({ transactionId: "DUPE-001" });

      act(() => { result.current.addToHistory(payment); });
      act(() => { result.current.addToHistory(payment); });

      expect(result.current.count).toBe(1);
    });

    it("respecte maxEntries et supprime les plus anciens", () => {
      const { result } = renderHook(() =>
        usePaymentHistory({ maxEntries: 3 })
      );

      act(() => { result.current.addToHistory(makeResult({ amount: 1000 })); });
      act(() => { result.current.addToHistory(makeResult({ amount: 2000 })); });
      act(() => { result.current.addToHistory(makeResult({ amount: 3000 })); });
      act(() => { result.current.addToHistory(makeResult({ amount: 4000 })); }); // provoque l'éviction

      expect(result.current.count).toBe(3);
      // Le plus ancien (1000) doit être évincé
      expect(result.current.history.map((e) => e.amount)).not.toContain(1000);
    });
  });

  // ---- lastTransaction & totalPaid ----------------------------------------

  describe("propriétés calculées", () => {
    it("lastTransaction pointe sur la dernière entrée ajoutée", () => {
      const { result } = renderHook(() => usePaymentHistory());

      act(() => { result.current.addToHistory(makeResult({ amount: 500 })); });
      act(() => { result.current.addToHistory(makeResult({ amount: 1500 })); });

      expect(result.current.lastTransaction?.amount).toBe(1500);
    });

    it("totalPaid est la somme de tous les montants", () => {
      const { result } = renderHook(() => usePaymentHistory());

      act(() => { result.current.addToHistory(makeResult({ amount: 2000 })); });
      act(() => { result.current.addToHistory(makeResult({ amount: 3000 })); });
      act(() => { result.current.addToHistory(makeResult({ amount: 5000 })); });

      expect(result.current.totalPaid).toBe(10000);
    });
  });

  // ---- removeFromHistory ---------------------------------------------------

  describe("removeFromHistory", () => {
    it("supprime l'entrée correspondant au transactionId", () => {
      const { result } = renderHook(() => usePaymentHistory());
      const a = makeResult({ transactionId: "TXN-A" });
      const b = makeResult({ transactionId: "TXN-B" });

      act(() => { result.current.addToHistory(a); });
      act(() => { result.current.addToHistory(b); });
      act(() => { result.current.removeFromHistory("TXN-A"); });

      expect(result.current.count).toBe(1);
      expect(result.current.history[0].transactionId).toBe("TXN-B");
    });

    it("est sans effet si le transactionId est inconnu", () => {
      const { result } = renderHook(() => usePaymentHistory());

      act(() => { result.current.addToHistory(makeResult()); });
      act(() => { result.current.removeFromHistory("UNKNOWN"); });

      expect(result.current.count).toBe(1);
    });
  });

  // ---- clearHistory --------------------------------------------------------

  describe("clearHistory", () => {
    it("vide l'historique en mémoire", () => {
      const { result } = renderHook(() => usePaymentHistory());

      act(() => { result.current.addToHistory(makeResult()); });
      act(() => { result.current.addToHistory(makeResult()); });
      act(() => { result.current.clearHistory(); });

      expect(result.current.history).toEqual([]);
      expect(result.current.count).toBe(0);
      expect(result.current.lastTransaction).toBeNull();
      expect(result.current.totalPaid).toBe(0);
    });

    it("supprime aussi la clé de sessionStorage", () => {
      const { result } = renderHook(() =>
        usePaymentHistory({ storage: "session" })
      );

      act(() => { result.current.addToHistory(makeResult()); });
      act(() => { result.current.clearHistory(); });

      expect(sessionStorage.getItem("rbp_payment_history")).toBeNull();
    });

    it("supprime aussi la clé de localStorage", () => {
      const { result } = renderHook(() =>
        usePaymentHistory({ storage: "local" })
      );

      act(() => { result.current.addToHistory(makeResult()); });
      act(() => { result.current.clearHistory(); });

      expect(localStorage.getItem("rbp_payment_history")).toBeNull();
    });
  });

  // ---- storageKey custom ---------------------------------------------------

  describe("storageKey personnalisée", () => {
    it("utilise la clé personnalisée pour sessionStorage", () => {
      const { result } = renderHook(() =>
        usePaymentHistory({ storage: "session", storageKey: "my_payments" })
      );

      act(() => { result.current.addToHistory(makeResult()); });

      expect(sessionStorage.getItem("my_payments")).not.toBeNull();
      expect(sessionStorage.getItem("rbp_payment_history")).toBeNull();
    });
  });
});
