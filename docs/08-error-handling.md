# Gestion des erreurs

## Types d'erreurs

```tsx
interface PaymentValidationError {
  code:
    | "MISSING_PUBLIC_KEY"
    | "INVALID_AMOUNT"
    | "SDK_NOT_LOADED"
    | "SDK_ERROR";
  message: string;
}
```

## Codes d'erreur

| Code                 | Description                          | Solution                                                         |
| -------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `MISSING_PUBLIC_KEY` | Clé API non fournie                  | Configurez `BeninPaymentProvider` ou passez la clé dans `config` |
| `INVALID_AMOUNT`     | Montant invalide (0 ou négatif)      | Vérifiez que `amount > 0`                                        |
| `SDK_NOT_LOADED`     | Le SDK n'a pas pu charger            | Vérifiez la connexion internet, attendez `scriptLoaded === true` |
| `SDK_ERROR`          | Erreur lors de l'ouverture du widget | Consultez les logs console avec `debug: true`                    |

## Exemple de gestion d'erreur

```tsx
const { openDialog, error } = useFedaPay(
  { transaction: { amount: 5000 } },
  {
    onError: (validationError) => {
      switch (validationError.code) {
        case "MISSING_PUBLIC_KEY":
          console.error("Clé API manquante");
          break;
        case "INVALID_AMOUNT":
          toast.error("Le montant doit être supérieur à 0");
          break;
        case "SDK_NOT_LOADED":
          toast.error("Veuillez patienter, le système de paiement charge...");
          break;
        case "SDK_ERROR":
          toast.error("Une erreur est survenue. Veuillez réessayer.");
          break;
      }
    },
  }
);

// Erreur de chargement du SDK
if (error) {
  return <Alert variant="error">{error.message}</Alert>;
}
```
