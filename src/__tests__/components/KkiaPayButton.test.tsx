import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { KkiaPayButton } from "../../components/KkiaPayButton";

// NODE_ENV=test auto-active le mode mock : scriptLoaded=true, loading=false dès le mount

const defaultConfig = {
  amount: 5000,
  key: "pk_test",
};

describe("KkiaPayButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendu initial", () => {
    it("affiche le texte 'Payer' par défaut", () => {
      render(<KkiaPayButton config={defaultConfig} />);
      expect(screen.getByRole("button")).toHaveTextContent("Payer");
    });

    it("affiche un texte personnalisé via text prop", () => {
      render(<KkiaPayButton config={defaultConfig} text="Régler" />);
      expect(screen.getByRole("button")).toHaveTextContent("Régler");
    });

    it("affiche children si fourni", () => {
      render(<KkiaPayButton config={defaultConfig}>Payer par mobile</KkiaPayButton>);
      expect(screen.getByRole("button")).toHaveTextContent("Payer par mobile");
    });

    it("est activé en mode mock (scriptLoaded=true, loading=false)", () => {
      render(<KkiaPayButton config={defaultConfig} />);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    it("est désactivé si disabled=true", () => {
      render(<KkiaPayButton config={defaultConfig} disabled />);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("accessibilité aria-busy", () => {
    it("aria-busy=false à l'état initial", () => {
      render(<KkiaPayButton config={defaultConfig} />);
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
        <KkiaPayButton
          config={{ amount: 5000, key: "pk_test" }}
          verifyUrl="/api/verify"
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
        <KkiaPayButton
          config={{ amount: 5000, key: "pk_test" }}
          verifyUrl="/api/verify"
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
    it("appelle onSuccess après paiement mock réussi", async () => {
      const onSuccess = vi.fn();
      render(<KkiaPayButton config={defaultConfig} onSuccess={onSuccess} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("appelle onValidationError si le montant est invalide", () => {
      const onValidationError = vi.fn();
      render(
        <KkiaPayButton
          config={{ amount: 0, key: "pk_test" }}
          onValidationError={onValidationError}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_AMOUNT" })
      );
    });
  });
});
