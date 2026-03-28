# Utilitaires

## formatXOF

Formate un montant en Francs CFA :

```tsx
import { formatXOF } from "react-benin-payments";

formatXOF(5000); // "5 000 FCFA"
formatXOF(1500000); // "1 500 000 FCFA"
formatXOF(0); // "0 FCFA"
```

## formatCurrency

Formate un montant dans différentes devises :

```tsx
import { formatCurrency } from "react-benin-payments";

formatCurrency(5000, "XOF"); // "5 000 FCFA"
formatCurrency(100, "USD"); // "$100.00"
formatCurrency(100, "EUR"); // "100,00 €"
```

## parseError

Transforme les erreurs techniques en messages utilisateur lisibles :

```tsx
import { parseError } from "react-benin-payments";

parseError("Network connection failed"); // "Problème de connexion internet."
parseError({ message: "User dismissed" }); // "Paiement annulé."
parseError("insufficient funds"); // "Solde insuffisant sur votre compte."
parseError("timeout"); // "La requête a expiré. Veuillez réessayer."
```

## generateMockTransactionId

Génère un ID de transaction factice (utile pour les tests) :

```tsx
import { generateMockTransactionId } from "react-benin-payments";

const mockId = generateMockTransactionId();
// "mock_tx_lq2x5m_abc123"
```
