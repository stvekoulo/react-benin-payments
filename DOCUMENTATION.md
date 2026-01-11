# Documentation react-benin-payments

Guide complet pour intégrer les paiements FedaPay et KKiaPay dans vos applications React et Next.js.

---

## Table des matières

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration initiale](#configuration-initiale)
4. [Utilisation de base](#utilisation-de-base)
5. [Utilisation avancée](#utilisation-avancée)
6. [Référence API](#référence-api)
7. [Utilitaires](#utilitaires)
8. [Gestion des erreurs](#gestion-des-erreurs)
9. [Mode Test et Production](#mode-test-et-production)
10. [FAQ](#faq)

---

## Introduction

### Qu'est-ce que react-benin-payments ?

`react-benin-payments` est une librairie React qui simplifie l'intégration des solutions de paiement béninoises FedaPay et KKiaPay. Elle fournit :

- Des **composants prêts à l'emploi** (boutons de paiement)
- Des **hooks React** pour une intégration personnalisée
- Un **système de configuration global** via Context
- Une **vérification backend automatique** des transactions
- Un **mode test** pour le développement

### Providers supportés

| Provider | Mobile Money | Carte bancaire | Site officiel                      |
| -------- | ------------ | -------------- | ---------------------------------- |
| FedaPay  | Oui          | Oui            | [fedapay.com](https://fedapay.com) |
| KKiaPay  | Oui          | Oui            | [kkiapay.me](https://kkiapay.me)   |

### Prérequis

- React 17.0.0 ou supérieur
- Un compte FedaPay et/ou KKiaPay
- Vos clés API publiques (sandbox pour le développement, live pour la production)

---

## Installation

### Via npm

```bash
npm install react-benin-payments
```

### Via yarn

```bash
yarn add react-benin-payments
```

### Via pnpm

```bash
pnpm add react-benin-payments
```

### Vérification de l'installation

```tsx
import { BeninPaymentProvider, FedaPayButton } from "react-benin-payments";

// Si pas d'erreur, l'installation est réussie
```

---

## Configuration initiale

### Étape 1 : Créer le Provider

Le `BeninPaymentProvider` doit envelopper votre application. Il permet de configurer vos clés API une seule fois.

#### Pour Next.js (App Router)

```tsx
// app/layout.tsx
import { BeninPaymentProvider } from "react-benin-payments";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <BeninPaymentProvider
          fedaPayPublicKey={process.env.NEXT_PUBLIC_FEDAPAY_KEY}
          kkiaPayPublicKey={process.env.NEXT_PUBLIC_KKIAPAY_KEY}
          defaultCurrency="XOF"
          isTestMode={process.env.NODE_ENV === "development"}
          debug={false}
        >
          {children}
        </BeninPaymentProvider>
      </body>
    </html>
  );
}
```

#### Pour React (Vite, CRA)

```tsx
// src/App.tsx ou src/main.tsx
import { BeninPaymentProvider } from "react-benin-payments";

function App() {
  return (
    <BeninPaymentProvider
      fedaPayPublicKey="pk_sandbox_xxxxx"
      kkiaPayPublicKey="pk_xxxxx"
      defaultCurrency="XOF"
      isTestMode={true}
    >
      <YourApp />
    </BeninPaymentProvider>
  );
}
```

### Étape 2 : Variables d'environnement

Créez un fichier `.env.local` :

```env
# FedaPay
NEXT_PUBLIC_FEDAPAY_KEY=pk_sandbox_xxxxxxxxxxxxxx

# KKiaPay
NEXT_PUBLIC_KKIAPAY_KEY=xxxxxxxxxxxxxxxxxxxxxx
```

**Important :** Ne commitez jamais vos clés API. Ajoutez `.env.local` à votre `.gitignore`.

---

## Utilisation de base

### FedaPayButton

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

### KkiaPayButton

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

### Personnalisation du texte

```tsx
<FedaPayButton
  config={{ transaction: { amount: 5000 } }}
  text="Acheter maintenant" // Texte par défaut
  loadingText="Chargement..." // Pendant le chargement du SDK
  verifyingText="Vérification..." // Pendant la vérification backend
/>
```

### Stylisation

Les boutons acceptent toutes les props HTML standard :

```tsx
<FedaPayButton
  config={{ transaction: { amount: 5000 } }}
  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
  style={{ minHeight: "60px" }}
  disabled={false}
/>
```

---

## Utilisation avancée

### Hooks personnalisés (Mode Headless)

Les hooks vous donnent un contrôle total sur l'interface utilisateur.

#### useFedaPay

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

#### useKkiaPay

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

### Vérification backend automatique

La librairie peut automatiquement vérifier chaque transaction avec votre backend.

#### Configuration côté client

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

#### Implémentation côté serveur (Next.js)

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

---

## Référence API

### BeninPaymentProvider

Provider de contexte pour la configuration globale.

```tsx
interface BeninPaymentProviderProps {
  children: React.ReactNode;

  // Clé publique FedaPay (commence par pk_sandbox_ ou pk_live_)
  fedaPayPublicKey?: string;

  // Clé publique KKiaPay
  kkiaPayPublicKey?: string;

  // Devise par défaut ('XOF' | 'USD' | 'EUR')
  defaultCurrency?: Currency; // défaut: 'XOF'

  // Force le mode sandbox pour tous les paiements
  isTestMode?: boolean; // défaut: false

  // Active les logs de débogage dans la console
  debug?: boolean; // défaut: false
}
```

### useBeninConfig

Hook pour accéder à la configuration globale :

```tsx
const {
  fedaPayPublicKey,
  kkiaPayPublicKey,
  defaultCurrency,
  isTestMode,
  debug,
  isProviderMounted,
} = useBeninConfig();
```

### FedaPayButton

| Prop             | Type               | Défaut              | Description                   |
| ---------------- | ------------------ | ------------------- | ----------------------------- |
| `config`         | `UseFedaPayConfig` | required            | Configuration du paiement     |
| `text`           | `string`           | `'Payer'`           | Texte du bouton               |
| `loadingText`    | `string`           | `'Chargement...'`   | Texte pendant le chargement   |
| `verifyingText`  | `string`           | `'Vérification...'` | Texte pendant la vérification |
| `debug`          | `boolean`          | `false`             | Active les logs               |
| `onPaymentError` | `(error) => void`  | -                   | Callback d'erreur             |
| `className`      | `string`           | -                   | Classes CSS                   |
| `style`          | `CSSProperties`    | -                   | Styles inline                 |
| `disabled`       | `boolean`          | `false`             | Désactive le bouton           |

### KkiaPayButton

| Prop                  | Type               | Défaut              | Description                   |
| --------------------- | ------------------ | ------------------- | ----------------------------- |
| `config`              | `UseKkiaPayConfig` | required            | Configuration du paiement     |
| `onSuccess`           | `(data) => void`   | -                   | Callback succès               |
| `onFailed`            | `(error) => void`  | -                   | Callback échec                |
| `onPaymentClose`      | `() => void`       | -                   | Callback fermeture            |
| `onValidationError`   | `(error) => void`  | -                   | Callback erreur validation    |
| `text`                | `string`           | `'Payer'`           | Texte du bouton               |
| `loadingText`         | `string`           | `'Chargement...'`   | Texte pendant le chargement   |
| `verifyingText`       | `string`           | `'Vérification...'` | Texte pendant la vérification |
| `verifyUrl`           | `string`           | -                   | URL de vérification backend   |
| `customVerifyHeaders` | `object`           | -                   | Headers personnalisés         |

### useFedaPay

```tsx
interface UseFedaPayConfig {
  // Clé publique (optionnelle si BeninPaymentProvider est utilisé)
  public_key?: string;

  // Détails de la transaction
  transaction: {
    amount: number;
    description?: string;
    callback_url?: string;
    custom_metadata?: Record<string, unknown>;
  };

  // Informations client
  customer?: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone_number?: {
      number: string;
      country: string;
    };
  };

  // Devise
  currency?: { iso: "XOF" | "USD" | "EUR" };

  // Mode sandbox
  sandbox?: boolean;

  // Métadonnées additionnelles
  metadata?: Record<string, unknown>;

  // Vérification backend
  verifyUrl?: string;
  verifyMethod?: "POST" | "GET";
  customVerifyHeaders?: Record<string, string>;

  // Callbacks
  onComplete?: (response: FedaPayCallbackResponse) => void;
  onClose?: () => void;
}

interface UseFedaPayOptions {
  debug?: boolean;
  mock?: boolean;
  onError?: (error: PaymentValidationError) => void;
}

interface UseFedaPayReturn {
  openDialog: () => void;
  loading: boolean;
  error: Error | null;
  scriptLoaded: boolean;
  isMockMode: boolean;
  isVerifying: boolean;
}
```

### useKkiaPay

```tsx
interface UseKkiaPayConfig {
  // Clé publique (optionnelle si BeninPaymentProvider est utilisé)
  key?: string;

  // Montant à payer
  amount: number;

  // Informations client
  name?: string;
  phone?: string;
  email?: string;

  // Description
  reason?: string;

  // Thème (couleur hex)
  theme?: string;

  // Mode sandbox
  sandbox?: boolean;

  // Méthodes de paiement autorisées
  paymentMethods?: ("momo" | "card")[];

  // Données personnalisées
  data?: Record<string, unknown>;
}

interface UseKkiaPayOptions {
  debug?: boolean;
  mock?: boolean;
  verifyUrl?: string;
  verifyMethod?: "POST" | "GET";
  customVerifyHeaders?: Record<string, string>;
  onSuccess?: (data: KkiaPaySuccessResponse) => void;
  onFailed?: (data: KkiaPayFailedResponse) => void;
  onClose?: () => void;
  onValidationError?: (error: PaymentValidationError) => void;
}

interface UseKkiaPayReturn {
  openKkiapay: (config: UseKkiaPayConfig) => void;
  loading: boolean;
  error: Error | null;
  scriptLoaded: boolean;
  isMockMode: boolean;
  isVerifying: boolean;
}
```

### useBeninPay

```tsx
interface UseBeninPayConfig {
  provider: "fedapay" | "kkiapay";
  fedapay?: UseFedaPayConfig;
  kkiapay?: UseKkiaPayConfig;
}

interface UseBeninPayOptions {
  debug?: boolean;
  mock?: boolean;
  onSuccess?: (result: UnifiedPaymentResult) => void;
  onFailed?: (error: KkiaPayFailedResponse) => void;
  onClose?: () => void;
  onError?: (error: PaymentValidationError) => void;
}

interface UnifiedPaymentResult {
  transactionId: string;
  amount: number;
  status: "success" | "failed" | "pending";
  rawResponse: FedaPayCallbackResponse | KkiaPaySuccessResponse;
}

interface UseBeninPayReturn {
  pay: () => void;
  loading: boolean;
  error: Error | null;
  isReady: boolean;
  provider: "fedapay" | "kkiapay";
  isMockMode: boolean;
  isVerifying: boolean;
}
```

---

## Utilitaires

### formatXOF

Formate un montant en Francs CFA :

```tsx
import { formatXOF } from "react-benin-payments";

formatXOF(5000); // "5 000 FCFA"
formatXOF(1500000); // "1 500 000 FCFA"
formatXOF(0); // "0 FCFA"
```

### formatCurrency

Formate un montant dans différentes devises :

```tsx
import { formatCurrency } from "react-benin-payments";

formatCurrency(5000, "XOF"); // "5 000 FCFA"
formatCurrency(100, "USD"); // "$100.00"
formatCurrency(100, "EUR"); // "100,00 €"
```

### parseError

Transforme les erreurs techniques en messages utilisateur lisibles :

```tsx
import { parseError } from "react-benin-payments";

parseError("Network connection failed"); // "Problème de connexion internet."
parseError({ message: "User dismissed" }); // "Paiement annulé."
parseError("insufficient funds"); // "Solde insuffisant sur votre compte."
parseError("timeout"); // "La requête a expiré. Veuillez réessayer."
```

### generateMockTransactionId

Génère un ID de transaction factice (utile pour les tests) :

```tsx
import { generateMockTransactionId } from "react-benin-payments";

const mockId = generateMockTransactionId();
// "mock_tx_lq2x5m_abc123"
```

---

## Gestion des erreurs

### Types d'erreurs

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

### Codes d'erreur

| Code                 | Description                          | Solution                                                         |
| -------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `MISSING_PUBLIC_KEY` | Clé API non fournie                  | Configurez `BeninPaymentProvider` ou passez la clé dans `config` |
| `INVALID_AMOUNT`     | Montant invalide (0 ou négatif)      | Vérifiez que `amount > 0`                                        |
| `SDK_NOT_LOADED`     | Le SDK n'a pas pu charger            | Vérifiez la connexion internet, attendez `scriptLoaded === true` |
| `SDK_ERROR`          | Erreur lors de l'ouverture du widget | Consultez les logs console avec `debug: true`                    |

### Exemple de gestion d'erreur

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

---

## Mode Test et Production

### Différences sandbox vs live

| Aspect       | Sandbox (Test)           | Live (Production)     |
| ------------ | ------------------------ | --------------------- |
| Clé API      | `pk_sandbox_...`         | `pk_live_...`         |
| Transactions | Simulées                 | Réelles               |
| Opérateurs   | "momo test", "card test" | MTN, Moov, Visa, etc. |
| Argent réel  | Non                      | Oui                   |

### Configuration pour le développement

```tsx
<BeninPaymentProvider
  fedaPayPublicKey="pk_sandbox_xxxxxx"
  isTestMode={true}
  debug={true}
>
```

### Configuration pour la production

```tsx
<BeninPaymentProvider
  fedaPayPublicKey={process.env.NEXT_PUBLIC_FEDAPAY_LIVE_KEY}
  isTestMode={false}
  debug={false}
>
```

### Détection automatique

```tsx
<BeninPaymentProvider
  fedaPayPublicKey={
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_FEDAPAY_LIVE_KEY
      : process.env.NEXT_PUBLIC_FEDAPAY_SANDBOX_KEY
  }
  isTestMode={process.env.NODE_ENV !== 'production'}
>
```

---

## FAQ

### Le widget affiche "momo test" au lieu des vrais opérateurs

C'est normal en mode sandbox. Les opérateurs de test permettent de simuler des paiements sans débiter de réels comptes. Passez en mode live pour voir les vrais opérateurs.

### Comment autoriser mon domaine pour FedaPay ?

1. Connectez-vous à votre tableau de bord FedaPay
2. Allez dans Paramètres > Domaines autorisés
3. Ajoutez votre domaine (ex: `https://monsite.com`)
4. Pour le développement local, ajoutez `http://localhost:3000`

### Le SDK ne charge pas

Vérifiez :

1. Votre connexion internet
2. Que votre domaine est autorisé dans le dashboard FedaPay/KKiaPay
3. Les erreurs dans la console du navigateur
4. Que les scripts ne sont pas bloqués par un adblocker

### Comment tester sans faire de vraies transactions ?

Utilisez le mode sandbox :

```tsx
<BeninPaymentProvider isTestMode={true}>
```

Ou utilisez le mode mock pour les tests automatisés :

```tsx
useFedaPay(config, { mock: true });
```

### Puis-je utiliser les deux providers simultanément ?

Oui ! Configurez les deux clés dans le provider :

```tsx
<BeninPaymentProvider
  fedaPayPublicKey="pk_xxx"
  kkiaPayPublicKey="pk_xxx"
>
```

Puis utilisez le bouton ou hook approprié selon vos besoins.

### Comment gérer les webhooks ?

Les webhooks sont gérés côté serveur, indépendamment de cette librairie. Consultez la documentation de FedaPay et KKiaPay pour configurer vos endpoints webhook.

---

## Support

- **GitHub Issues** : [Signaler un bug](https://github.com/stvekoulo/react-benin-payments/issues)
- **Documentation FedaPay** : [docs.fedapay.com](https://docs.fedapay.com)
- **Documentation KKiaPay** : [docs.kkiapay.me](https://docs.kkiapay.me)

---

Made with care in Benin by **Steven KOULO**
