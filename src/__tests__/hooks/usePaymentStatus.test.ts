import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePaymentStatus } from "../../hooks/usePaymentStatus";

// Intervalle très court pour que les tests restent rapides avec de vrais timers
const POLL = 30;

const defaultOptions = {
  checkUrl: "/api/status",
  transactionId: "tx_abc123",
  provider: "fedapay" as const,
  pollInterval: POLL,
};

describe("usePaymentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pas de fake timers — setInterval actif bloque act() indéfiniment avec fake timers
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("état initial", () => {
    it("démarre avec status=pending", () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "pending" }),
        })
      );

      const { result } = renderHook(() =>
        usePaymentStatus({ ...defaultOptions, enabled: false })
      );

      expect(result.current.status).toBe("pending");
      expect(result.current.attempts).toBe(0);
    });

    it("ne poll pas si enabled=false", () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      renderHook(() =>
        usePaymentStatus({ ...defaultOptions, enabled: false })
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("isPolling=false si enabled=false", () => {
      vi.stubGlobal("fetch", vi.fn());

      const { result } = renderHook(() =>
        usePaymentStatus({ ...defaultOptions, enabled: false })
      );

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("polling et mise à jour du statut", () => {
    it("appelle le checkUrl avec les bons params", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "approved" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      renderHook(() => usePaymentStatus(defaultOptions));

      await waitFor(() => expect(mockFetch).toHaveBeenCalled(), {
        timeout: 2000,
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("transactionId=tx_abc123");
      expect(url).toContain("provider=fedapay");
    });

    it("met à jour le statut quand la réponse est approved", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "approved" }),
        })
      );

      const { result } = renderHook(() => usePaymentStatus(defaultOptions));

      await waitFor(() => expect(result.current.status).toBe("approved"), {
        timeout: 2000,
      });
    });

    it("incrémente le compteur d'attempts", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "approved" }),
        })
      );

      const { result } = renderHook(() => usePaymentStatus(defaultOptions));

      await waitFor(
        () => expect(result.current.attempts).toBeGreaterThanOrEqual(1),
        { timeout: 2000 }
      );
    });
  });

  describe("arrêt automatique du polling", () => {
    it("arrête le polling sur statut approved", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "approved" }),
        })
      );

      const { result } = renderHook(() => usePaymentStatus(defaultOptions));

      await waitFor(
        () => {
          expect(result.current.isPolling).toBe(false);
          expect(result.current.status).toBe("approved");
        },
        { timeout: 2000 }
      );
    });

    it("arrête le polling sur statut declined", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "declined" }),
        })
      );

      const { result } = renderHook(() => usePaymentStatus(defaultOptions));

      await waitFor(
        () => {
          expect(result.current.isPolling).toBe(false);
          expect(result.current.status).toBe("declined");
        },
        { timeout: 2000 }
      );
    });

    it("arrête le polling sur statut cancelled", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "cancelled" }),
        })
      );

      const { result } = renderHook(() => usePaymentStatus(defaultOptions));

      await waitFor(
        () => {
          expect(result.current.isPolling).toBe(false);
          expect(result.current.status).toBe("cancelled");
        },
        { timeout: 2000 }
      );
    });

    it("arrête le polling après maxAttempts", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "pending" }),
        })
      );

      const { result } = renderHook(() =>
        usePaymentStatus({ ...defaultOptions, maxAttempts: 3 })
      );

      await waitFor(
        () => {
          expect(result.current.attempts).toBe(3);
          expect(result.current.isPolling).toBe(false);
        },
        { timeout: 2000 }
      );
    });
  });

  describe("callbacks", () => {
    it("appelle onStatusChange quand le statut change", async () => {
      const onStatusChange = vi.fn();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "approved" }),
        })
      );

      renderHook(() =>
        usePaymentStatus({ ...defaultOptions, onStatusChange })
      );

      await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith("approved"), {
        timeout: 2000,
      });
    });

    it("n'appelle pas onStatusChange si le statut ne change pas", async () => {
      const onStatusChange = vi.fn();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "pending" }),
        })
      );

      const { result } = renderHook(() =>
        usePaymentStatus({
          ...defaultOptions,
          maxAttempts: 3,
          onStatusChange,
        })
      );

      // Attendre que les 3 tentatives soient épuisées
      await waitFor(() => expect(result.current.attempts).toBe(3), {
        timeout: 2000,
      });

      // pending → pending ne déclenche pas le callback
      expect(onStatusChange).not.toHaveBeenCalled();
    });
  });

  describe("contrôle manuel", () => {
    it("stopPolling arrête le polling", () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "pending" }),
        })
      );

      const { result } = renderHook(() =>
        usePaymentStatus({ ...defaultOptions, enabled: false })
      );

      act(() => result.current.stopPolling());

      expect(result.current.isPolling).toBe(false);
    });

    it("startPolling remet isPolling à true et reset le compteur", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: "approved" }),
        })
      );

      const { result } = renderHook(() => usePaymentStatus(defaultOptions));

      // Laisser le polling s'arrêter sur "approved"
      await waitFor(() => expect(result.current.isPolling).toBe(false), {
        timeout: 2000,
      });

      act(() => result.current.startPolling());

      expect(result.current.isPolling).toBe(true);
      expect(result.current.attempts).toBe(0);
      expect(result.current.status).toBe("pending");

      // Arrêter pour ne pas laisser tourner le hook après le test
      act(() => result.current.stopPolling());
    });
  });

  describe("gestion des erreurs réseau", () => {
    it("stocke l'erreur en cas d'échec fetch", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );

      const { result } = renderHook(() =>
        usePaymentStatus({ ...defaultOptions, maxAttempts: 1 })
      );

      await waitFor(() => expect(result.current.error).not.toBeNull(), {
        timeout: 2000,
      });

      expect(result.current.error?.message).toContain("Network error");
    });

    it("stocke l'erreur si la réponse HTTP n'est pas ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: "Erreur serveur" }),
        })
      );

      const { result } = renderHook(() =>
        usePaymentStatus({ ...defaultOptions, maxAttempts: 1 })
      );

      await waitFor(() => expect(result.current.error).not.toBeNull(), {
        timeout: 2000,
      });
    });
  });
});
