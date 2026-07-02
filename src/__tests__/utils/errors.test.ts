import { describe, it, expect } from "vitest";
import { parseError, createParsedError, DEFAULT_ERROR_PATTERNS } from "../../utils/errors";

describe("parseError", () => {
  it("retourne le message par défaut pour null", () => {
    expect(parseError(null)).toBe("Une erreur inconnue est survenue.");
  });

  it("retourne le message par défaut pour undefined", () => {
    expect(parseError(undefined)).toBe("Une erreur inconnue est survenue.");
  });

  it("détecte une erreur réseau (string)", () => {
    expect(parseError("network connection failed")).toBe(
      "Problème de connexion internet."
    );
  });

  it("détecte une erreur réseau (Error object)", () => {
    expect(parseError(new Error("offline"))).toBe(
      "Problème de connexion internet."
    );
  });

  it("détecte un solde insuffisant", () => {
    expect(parseError("insufficient funds")).toBe(
      "Solde insuffisant sur votre compte."
    );
  });

  it("détecte un timeout", () => {
    expect(parseError("request timeout")).toBe(
      "La requête a expiré. Veuillez réessayer."
    );
  });

  it("détecte une clé invalide", () => {
    expect(parseError("invalid key provided")).toBe("Clé API invalide.");
  });

  it("détecte un montant invalide", () => {
    expect(parseError("invalid amount")).toBe("Montant invalide.");
  });

  it("détecte une erreur 401", () => {
    expect(parseError("401 unauthorized")).toBe("Accès non autorisé.");
  });

  it("détecte une erreur 404", () => {
    expect(parseError("not found 404")).toBe("Ressource introuvable.");
  });

  it("détecte une erreur 500", () => {
    expect(parseError("server error 500")).toBe(
      "Erreur serveur. Veuillez réessayer."
    );
  });

  it("détecte une annulation", () => {
    expect(parseError("user closed dialog")).toBe("Paiement annulé.");
  });

  it("retourne le message original si aucun pattern ne correspond", () => {
    expect(parseError("some custom error")).toBe("some custom error");
  });

  it("gère un objet d'erreur avec message", () => {
    expect(parseError({ message: "network error" })).toBe(
      "Problème de connexion internet."
    );
  });

  it("gère un objet d'erreur avec propriété error", () => {
    expect(parseError({ error: "timeout occurred" })).toBe(
      "La requête a expiré. Veuillez réessayer."
    );
  });
});

describe("createParsedError", () => {
  it("retourne une instance d'Error", () => {
    const err = createParsedError("network failed");
    expect(err).toBeInstanceOf(Error);
  });

  it("le message est traduit en français", () => {
    const err = createParsedError("network failed");
    expect(err.message).toBe("Problème de connexion internet.");
  });

  it("gère un Error object en entrée", () => {
    const err = createParsedError(new Error("timeout"));
    expect(err.message).toBe("La requête a expiré. Veuillez réessayer.");
  });
});

describe("parseError avec contrôle total (i18n)", () => {
  it("accepte des patterns personnalisés à la place des valeurs par défaut", () => {
    const result = parseError("network failed", {
      patterns: [{ pattern: /network/i, message: "No internet connection." }],
    });

    expect(result).toBe("No internet connection.");
  });

  it("permet d'étendre DEFAULT_ERROR_PATTERNS plutôt que de tout réécrire", () => {
    const result = parseError("insufficient funds", {
      patterns: [
        { pattern: /custom-case/i, message: "Cas particulier." },
        ...DEFAULT_ERROR_PATTERNS,
      ],
    });

    expect(result).toBe("Solde insuffisant sur votre compte.");
  });

  it("accepte un fallbackMessage personnalisé", () => {
    const result = parseError(null, { fallbackMessage: "Unknown error." });
    expect(result).toBe("Unknown error.");
  });

  it("createParsedError transmet les options à parseError", () => {
    const err = createParsedError("network failed", {
      patterns: [{ pattern: /network/i, message: "No internet connection." }],
    });

    expect(err.message).toBe("No internet connection.");
  });
});
