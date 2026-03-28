# Utilisation de base

## FedaPayButton

Le composant le plus simple pour accepter des paiements FedaPay.

```tsx
import { FedaPayButton } from "react-benin-payments";

function PaymentPage() {
  return (
    <FedaPayButton
      config={{
        transaction: {
          amount: 5000,
          description: "Achat de produit",
        },
        customer: {
          email: "client@example.com",
        },
        onComplete: (response) => {
          console.log("Paiement réussi !", response.transaction.reference);
        },
        onClose: () => {
          console.log("Fenêtre de paiement fermée");
        },
      }}
      text="Payer 5 000 FCFA"
      className="bg-green-600 text-white px-6 py-3 rounded-lg"
    />
  );
}
```

## KkiaPayButton

Pour les paiements KKiaPay :

```tsx
import { KkiaPayButton } from "react-benin-payments";

function PaymentPage() {
  return (
    <KkiaPayButton
      config={{
        amount: 5000,
        name: "Jean Dupont",
        phone: "22967000000",
        email: "jean@example.com",
        reason: "Achat en ligne",
      }}
      onSuccess={(data) => {
        console.log("Paiement réussi !", data.transactionId);
      }}
      onFailed={(error) => {
        console.error("Échec du paiement", error.message);
      }}
      onPaymentClose={() => {
        console.log("Widget fermé");
      }}
      text="Payer avec KKiaPay"
      className="bg-blue-600 text-white px-6 py-3 rounded-lg"
    />
  );
}
```

## Personnalisation du texte

```tsx
<FedaPayButton
  config={{ transaction: { amount: 5000 } }}
  text="Acheter maintenant" // Texte par défaut
  loadingText="Chargement..." // Pendant le chargement du SDK
  verifyingText="Vérification..." // Pendant la vérification backend
/>
```

## Stylisation

Les boutons acceptent toutes les props HTML standard :

```tsx
<FedaPayButton
  config={{ transaction: { amount: 5000 } }}
  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
  style={{ minHeight: "60px" }}
  disabled={false}
/>
```
