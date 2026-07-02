import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PaymentDriverContext } from "../../core/types";
import type { KkiaPaySuccessResponse } from "../../types";

// providers/kkiapay.ts keeps its "who's currently listening" state at module
// scope (the SDK only supports one open widget at a time). Reset the module
// registry between tests so each `it()` gets a fresh, unattached instance
// instead of leaking state from the previous test's `ensureGlobalListeners()`.
beforeEach(() => {
  vi.resetModules();
});

async function loadDriver() {
  const { createKkiaPayDriver } = await import("../../providers/kkiapay");
  return createKkiaPayDriver();
}

describe("KKiaPay driver — un seul appelant actif à la fois", () => {
  it("ne relaie l'événement global qu'au dernier open(), pas à un appel précédent laissé en attente", async () => {
    let successCallback: ((data: KkiaPaySuccessResponse) => void) | undefined;

    Object.assign(window, {
      addKkiapayListener: vi.fn((event: string, cb: (data: unknown) => void) => {
        if (event === "success") successCallback = cb as (data: KkiaPaySuccessResponse) => void;
      }),
      openKkiapayWidget: vi.fn(),
    });

    const driver = await loadDriver();
    const fakeCtx = {} as PaymentDriverContext;

    // Deux instances useKkiaPay() distinctes appellent open() l'une après
    // l'autre (ex: un composant qui n'a jamais terminé son paiement, puis un
    // second qui en démarre un nouveau).
    const onSuccessFirst = vi.fn();
    const onSuccessSecond = vi.fn();

    driver.open(
      { key: "pk_first", amount: 1000 },
      { onSuccess: onSuccessFirst, onFailure: vi.fn(), onClose: vi.fn() },
      fakeCtx
    );
    driver.open(
      { key: "pk_second", amount: 2000 },
      { onSuccess: onSuccessSecond, onFailure: vi.fn(), onClose: vi.fn() },
      fakeCtx
    );

    // Le SDK KKiaPay ne supporte qu'un widget ouvert à la fois : un seul
    // événement "success" arrive du SDK réel.
    const successData: KkiaPaySuccessResponse = {
      transactionId: "tx_second",
      amount: 2000,
      phone: "+22900000000",
    };
    successCallback?.(successData);

    expect(onSuccessSecond).toHaveBeenCalledWith(successData);
    expect(onSuccessFirst).not.toHaveBeenCalled();
  });

  it("n'invoque plus aucun handler pour un second événement une fois le premier consommé", async () => {
    let successCallback: ((data: KkiaPaySuccessResponse) => void) | undefined;

    Object.assign(window, {
      addKkiapayListener: vi.fn((event: string, cb: (data: unknown) => void) => {
        if (event === "success") successCallback = cb as (data: KkiaPaySuccessResponse) => void;
      }),
      openKkiapayWidget: vi.fn(),
    });

    const driver = await loadDriver();
    const fakeCtx = {} as PaymentDriverContext;
    const onSuccess = vi.fn();

    driver.open({ key: "pk_1", amount: 1000 }, { onSuccess, onFailure: vi.fn(), onClose: vi.fn() }, fakeCtx);

    const data: KkiaPaySuccessResponse = { transactionId: "tx_1", amount: 1000, phone: "+22900000000" };
    successCallback?.(data);
    successCallback?.(data);

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
