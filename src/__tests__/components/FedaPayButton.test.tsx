import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FedaPayButton } from "../../components/FedaPayButton";

// NODE_ENV=test auto-active le mode mock : scriptLoaded=true, loading=false dès le mount

const defaultConfig = {
  public_key: "pk_live_test",
  transaction: { amount: 5000 },
};

describe("FedaPayButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendu initial", () => {
    it("affiche le texte 'Payer' par défaut", () => {
      render(<FedaPayButton config={defaultConfig} />);
      expect(screen.getByRole("button")).toHaveTextContent("Payer");
    });

    it("affiche un texte personnalisé via text prop", () => {
      render(<FedaPayButton config={defaultConfig} text="Acheter" />);
      expect(screen.getByRole("button")).toHaveTextContent("Acheter");
    });

    it("affiche children si fourni", () => {
      render(<FedaPayButton config={defaultConfig}>Payer maintenant</FedaPayButton>);
      expect(screen.getByRole("button")).toHaveTextContent("Payer maintenant");
    });

    it("est activé en mode mock (scriptLoaded=true, loading=false)", () => {
      render(<FedaPayButton config={defaultConfig} />);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    it("est désactivé si disabled=true", () => {
      render(<FedaPayButton config={defaultConfig} disabled />);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("accessibilité aria-busy", () => {
    it("aria-busy=false à l'état initial", () => {
      render(<FedaPayButton config={defaultConfig} />);
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
    });

    it("aria-busy=true pendant la vérification backend", async () => {
      let resolveFetch!: (v: unknown) => void;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(
          () => new Promise((res) => { resolveFetch = res; })
        )
      );

      render(
        <FedaPayButton
          config={{
            transaction: { amount: 5000 },
            verifyUrl: "/api/verify",
          }}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Fetch en cours → isVerifying=true → aria-busy=true
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");

      // Nettoyer : résoudre le fetch
      await act(async () => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });
    });

    it("aria-busy=false après vérification terminée", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );

      render(
        <FedaPayButton
          config={{
            transaction: { amount: 5000 },
            verifyUrl: "/api/verify",
          }}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
    });
  });

  describe("interactions", () => {
    it("appelle onComplete après paiement mock réussi", async () => {
      const onComplete = vi.fn();
      render(
        <FedaPayButton config={{ ...defaultConfig, onComplete }} />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("appelle onPaymentError si le montant est invalide", () => {
      const onPaymentError = vi.fn();
      render(
        <FedaPayButton
          config={{ transaction: { amount: 0 } }}
          onPaymentError={onPaymentError}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      expect(onPaymentError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });
  });
});
