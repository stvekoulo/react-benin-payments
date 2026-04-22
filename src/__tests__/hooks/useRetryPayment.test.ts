import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRetryPayment } from "../../hooks/useRetryPayment";

describe("useRetryPayment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("exécute l'action avec succès du premier coup", async () => {
    const action = vi.fn().mockResolvedValue("success-data");
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useRetryPayment(action, { onSuccess })
    );

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.execute("arg1", "arg2");
    });

    // On attend la résolution
    await act(async () => {
      await promise;
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith("arg1", "arg2");
    expect(onSuccess).toHaveBeenCalledWith("success-data");
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.attemptCount).toBe(0);
  });

  it("fait des retrys et réussit finalement", async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fail 1"))
      .mockRejectedValueOnce(new Error("Fail 2"))
      .mockResolvedValue("success-data");

    const onRetry = vi.fn();
    const onSuccess = vi.fn();
    const onFail = vi.fn();

    const { result } = renderHook(() =>
      useRetryPayment(action, {
        maxRetries: 3,
        baseDelay: 1000,
        backoffFactor: 2,
        onRetry,
        onSuccess,
        onFail,
      })
    );

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.execute();
    });

    // 1er échec -> déclenche le retry 1 (delay 1000ms)
    await act(async () => {
      await Promise.resolve(); // Laisse le catch s'exécuter
    });
    expect(result.current.error).toEqual(new Error("Fail 1"));
    expect(result.current.attemptCount).toBe(1);
    expect(onRetry).toHaveBeenCalledWith(1, 1000, new Error("Fail 1"));
    expect(result.current.isPending).toBe(true);

    // Avance de 1000ms
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve(); // Laisse le 2ème appel se terminer
    });

    // 2ème échec -> déclenche le retry 2 (delay 2000ms = 1000 * 2^1)
    expect(result.current.error).toEqual(new Error("Fail 2"));
    expect(result.current.attemptCount).toBe(2);
    expect(onRetry).toHaveBeenCalledWith(2, 2000, new Error("Fail 2"));

    // Avance de 2000ms
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await promise; // Laisse le 3ème appel (succès) se terminer
    });

    expect(action).toHaveBeenCalledTimes(3);
    expect(onSuccess).toHaveBeenCalledWith("success-data");
    expect(onFail).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // L'erreur reste stockée de la dernière tentative échouée, mais l'état n'est plus pending.
    // L'utilisateur du hook peut se fier à "isPending = false" et vérifier si c'est un succès.
  });

  it("échoue après avoir épuisé tous les retries", async () => {
    const error = new Error("Fatal Error");
    const action = vi.fn().mockRejectedValue(error);
    const onFail = vi.fn();

    const { result } = renderHook(() =>
      useRetryPayment(action, {
        maxRetries: 2,
        baseDelay: 100,
        onFail,
      })
    );

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.execute().catch(() => {}); // On catch l'erreur finale pour éviter Unhandled Promise Rejection
    });

    // 1er échec (0) -> retry 1
    await act(async () => {
      await Promise.resolve();
    });

    // Avance temps (retry 1)
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // Avance temps (retry 2)
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await act(async () => {
      await promise;
    });

    expect(action).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    expect(onFail).toHaveBeenCalledWith(error);
    expect(result.current.isPending).toBe(false);
  });

  it("annule l'exécution en cours", async () => {
    const action = vi.fn().mockRejectedValue(new Error("Fail"));
    const onFail = vi.fn();

    const { result } = renderHook(() =>
      useRetryPayment(action, { maxRetries: 2, baseDelay: 1000, onFail })
    );

    act(() => {
      result.current.execute().catch(() => {});
    });

    // Laisse le premier échec se produire
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.attemptCount).toBe(1);
    expect(result.current.isPending).toBe(true);

    // Annule avant que le timer n'expire
    act(() => {
      result.current.cancel();
    });

    expect(result.current.isPending).toBe(false);

    // Avance le temps pour vérifier qu'aucun autre appel n'est fait
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(action).toHaveBeenCalledTimes(1); // Le timer a été annulé
    expect(onFail).not.toHaveBeenCalled();
  });
});
