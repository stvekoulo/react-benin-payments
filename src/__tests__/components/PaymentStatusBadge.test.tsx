import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge } from "../../components/PaymentStatusBadge";

describe("PaymentStatusBadge", () => {
  it("affiche le statut par défaut (en français)", () => {
    render(<PaymentStatusBadge status="approved" />);
    const badge = screen.getByTestId("payment-status-badge");
    
    expect(badge).toHaveTextContent("Approuvé");
    expect(badge).toHaveAttribute("data-status", "approved");
    
    // Par défaut, des styles inline sont appliqués
    expect(badge.style.backgroundColor).toBe("rgb(209, 250, 229)"); // #d1fae5
    expect(badge.style.color).toBe("rgb(5, 150, 105)"); // #059669
  });

  it("affiche les libellés personnalisés via la prop 'labels'", () => {
    render(
      <PaymentStatusBadge 
        status="pending" 
        labels={{ pending: "Waiting..." }} 
      />
    );
    expect(screen.getByTestId("payment-status-badge")).toHaveTextContent("Waiting...");
  });

  it("retire les styles inline lorsque unstyled={true}", () => {
    render(<PaymentStatusBadge status="declined" unstyled />);
    const badge = screen.getByTestId("payment-status-badge");
    
    // backgroundColor ne doit pas être défini
    expect(badge.style.backgroundColor).toBe("");
    expect(badge.style.color).toBe("");
  });

  it("applique les classes Tailwind/CSS via statusClasses", () => {
    render(
      <PaymentStatusBadge 
        status="cancelled" 
        className="base-class"
        statusClasses={{ cancelled: "bg-gray text-white" }} 
      />
    );
    const badge = screen.getByTestId("payment-status-badge");
    
    expect(badge).toHaveClass("base-class");
    expect(badge).toHaveClass("bg-gray");
    expect(badge).toHaveClass("text-white");
  });

  it("accepte des attributs HTML standards (aria, title, etc.)", () => {
    render(
      <PaymentStatusBadge 
        status="unknown" 
        title="Statut inconnu" 
        aria-label="Badge de statut" 
      />
    );
    const badge = screen.getByTestId("payment-status-badge");
    
    expect(badge).toHaveAttribute("title", "Statut inconnu");
    expect(badge).toHaveAttribute("aria-label", "Badge de statut");
  });
});
