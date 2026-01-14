# Utilisation avancée

## Hooks personnalisés (Mode Headless)

Les hooks vous donnent un contrôle total sur l'interface utilisateur.

### useFedaPay

```tsx
import { useFedaPay } from "react-benin-payments";

function CustomPaymentForm() {
  const {
    openDialog, // Fonction pour ouvrir le widget de paiement
    loading, // true pendant le chargement du SDK
    error, // Erreur si le SDK n'a pas pu charger
    scriptLoaded, // true quand le SDK est prêt
    isVerifying, // true pendant la vérification backend
    isMockMode, // true si en mode simulation
  } = useFedaPay(
    {
      transaction: {
        amount: 5000,
        description: "Abonnement Premium",
      },
      customer: {
        email: "user@example.com",
        firstname: "Jean",
        lastname: "Dupont",
      },
      onComplete: (response) => {
        // Traitement après paiement réussi
        saveToDatabase(response.transaction.reference);
        router.push("/success");
      },
      onClose: () => {
        // L'utilisateur a fermé le widget
      },
    },
    {
      debug: true, // Active les logs console
      mock: false, // Mode simulation
      onError: (error) => {
        // Gestion des erreurs de validation
        toast.error(error.message);
      },
    }
  );

  if (loading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (error) {
    return <Alert variant="error">{error.message}</Alert>;
  }

  return (
    <div className="space-y-4">
      <h2>Votre commande : 5 000 FCFA</h2>

      <button
        onClick={openDialog}
        disabled={!scriptLoaded || isVerifying}
        className="w-full bg-green-600 text-white py-3 rounded-lg disabled:opacity-50"
      >
        {isVerifying ? "Vérification en cours..." : "Procéder au paiement"}
      </button>
    </div>
  );
}
```

### useKkiaPay

```tsx
import { useKkiaPay } from "react-benin-payments";

function CustomKkiaPayForm() {
  const { openKkiapay, loading, error, scriptLoaded, isVerifying } = useKkiaPay(
    {
      debug: true,
      onSuccess: (data) => {
        console.log("Transaction ID:", data.transactionId);
        console.log("Montant:", data.amount);
        console.log("Téléphone:", data.phone);
      },
      onFailed: (error) => {
        console.error("Échec:", error.message);
      },
      onClose: () => {
        console.log("Widget fermé");
      },
    }
  );

  const handlePayment = () => {
    openKkiapay({
      amount: 5000,
      name: "Jean Dupont",
      phone: "22967000000",
      reason: "Achat produit",
    });
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      Payer maintenant
    </button>
  );
}
```

### Hook universel useBeninPay

Ce hook permet de changer de provider dynamiquement :

```tsx
import { useBeninPay } from "react-benin-payments";

function FlexiblePayment() {
  // Le provider peut venir d'une préférence utilisateur, d'un A/B test, etc.
  const [provider, setProvider] = useState<"fedapay" | "kkiapay">("fedapay");

  const {
    pay,
    loading,
    error,
    isReady,
    isVerifying,
    isMockMode,
    provider: currentProvider,
  } = useBeninPay(
    {
      provider,
      fedapay: {
        transaction: { amount: 5000, description: "Commande #123" },
        customer: { email: "user@example.com" },
      },
      kkiapay: {
        amount: 5000,
        name: "Jean Dupont",
        reason: "Commande #123",
      },
    },
    {
      debug: true,
      onSuccess: (result) => {
        // Interface unifiée pour les deux providers
        console.log("Transaction ID:", result.transactionId);
        console.log("Montant:", result.amount);
        console.log("Statut:", result.status);
        console.log("Réponse brute:", result.rawResponse);
      },
      onFailed: (error) => {
        console.error("Échec:", error);
      },
      onClose: () => {
        console.log("Fermé");
      },
      onError: (error) => {
        console.error("Erreur de validation:", error);
      },
    }
  );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setProvider("fedapay")}
          className={
            provider === "fedapay" ? "bg-green-600 text-white" : "bg-gray-200"
          }
        >
          FedaPay
        </button>
        <button
          onClick={() => setProvider("kkiapay")}
          className={
            provider === "kkiapay" ? "bg-blue-600 text-white" : "bg-gray-200"
          }
        >
          KKiaPay
        </button>
      </div>

      <button
        onClick={pay}
        disabled={!isReady || loading || isVerifying}
        className="w-full bg-black text-white py-3 rounded-lg"
      >
        {loading && "Chargement..."}
        {isVerifying && "Vérification..."}
        {!loading && !isVerifying && `Payer avec ${currentProvider}`}
      </button>
    </div>
  );
}
```

## Vérification backend automatique

La librairie peut automatiquement vérifier chaque transaction avec votre backend.

### Configuration côté client

```tsx
<FedaPayButton
  config={{
    transaction: { amount: 5000 },
    verifyUrl: "/api/payments/verify",
    verifyMethod: "POST", // ou 'GET'
    customVerifyHeaders: {
      Authorization: `Bearer ${userToken}`,
      "X-Custom-Header": "value",
    },
    onComplete: (response) => {
      // Appelé SEULEMENT après vérification backend réussie
      console.log("Paiement vérifié !");
    },
  }}
/>
```

### Implémentation côté serveur (Next.js)

```typescript
// app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from "next/server";

interface VerifyPayload {
  transactionId: string;
  amount: number;
  provider: "fedapay" | "kkiapay";
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyPayload = await request.json();

    console.log("Vérification de la transaction:", body.transactionId);
    console.log("Provider:", body.provider);
    console.log("Montant:", body.amount);

    // Vérifiez avec l'API du provider
    let isValid = false;

    if (body.provider === "fedapay") {
      // Appel à l'API FedaPay pour vérifier
      const response = await fetch(
        `https://api.fedapay.com/v1/transactions/${body.transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
          },
        }
      );
      const data = await response.json();
      isValid = data.v1.transaction.status === "approved";
    } else if (body.provider === "kkiapay") {
      // Appel à l'API KKiaPay pour vérifier
      const response = await fetch(
        `https://api.kkiapay.me/api/v1/transactions/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.KKIAPAY_API_KEY!,
          },
          body: JSON.stringify({ transactionId: body.transactionId }),
        }
      );
      const data = await response.json();
      isValid = data.status === "SUCCESS";
    }

    if (isValid) {
      // Mettez à jour votre base de données
      await prisma.order.update({
        where: { transactionId: body.transactionId },
        data: { status: "paid", paidAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "Transaction vérifiée avec succès",
      });
    }

    return NextResponse.json(
      { success: false, message: "Transaction invalide ou non approuvée" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erreur de vérification:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
```

### Composants Consumer (Render Props)

Pour un contrôle maximal avec le pattern render props :

```tsx
import { FedaPayConsumer } from "react-benin-payments";

function AdvancedPayment() {
  return (
    <FedaPayConsumer
      config={{
        transaction: { amount: 5000 },
        onComplete: (response) => console.log(response),
      }}
    >
      {({ open, loading, error, scriptLoaded, isVerifying }) => (
        <div className="payment-card">
          {error && <p className="text-red-500">{error.message}</p>}

          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                scriptLoaded ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span>{scriptLoaded ? "SDK prêt" : "Chargement du SDK..."}</span>
          </div>

          <button
            onClick={open}
            disabled={loading || !scriptLoaded || isVerifying}
            className="mt-4 w-full bg-green-600 text-white py-3 rounded"
          >
            {loading
              ? "Chargement..."
              : isVerifying
              ? "Vérification..."
              : "Payer"}
          </button>
        </div>
      )}
    </FedaPayConsumer>
  );
}
```

### Mode Mock (Tests)

Pour tester sans charger les vrais SDKs :

```tsx
const { openDialog, isMockMode } = useFedaPay(
  { transaction: { amount: 5000 } },
  { mock: true }
);

// Ou automatiquement en environnement de test
// (activé quand process.env.NODE_ENV === 'test')
```

En mode mock :

- Aucun script externe n'est chargé
- Le paiement est simulé avec un délai de 1 seconde
- `onComplete` est appelé avec une transaction factice
- Idéal pour les tests unitaires et d'intégration
