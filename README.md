# react-benin-payments

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Size](https://img.shields.io/badge/size-27.4kb-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)
![Next.js](https://img.shields.io/badge/Next.js-13%2F14%2F15-black.svg)

**L'intégration la plus simple de FedaPay et KKiaPay pour React & Next.js.**

Gère automatiquement le chargement des scripts, les modales de paiement et la vérification backend.

**[Documentation complète](./DOCUMENTATION.md)** | [Exemple d'application](./example)

---

## Fonctionnalités

- **Hooks & Composants** — `useFedaPay`, `useKkiaPay`, `FedaPayButton`, `KkiaPayButton`
- **TypeScript Ready** — Autocomplétion complète et types exportés
- **Headless UI** — Contrôle total sur le style (compatible Shadcn UI / Tailwind CSS)
- **Global Provider** — Configurez vos clés API une seule fois
- **Auto-Verify** — Validation automatique via votre backend API
- **Mock Mode** — Simulez des paiements en développement
- **Hook Universel** — `useBeninPay` pour changer de provider dynamiquement
- **Messages d'erreur localisés** — UX optimisée pour les utilisateurs francophones

---

## Mises à jour récentes

### Bugs déjà corrigés dans le projet

- `🐛 Bug 1 — Double chargement des SDKs`
- `🐛 Bug 2 — Mutation directe de l'objet config (useBeninPay.ts)`
- `🐛 Bug 3 — Boucle infinie de listeners KKiaPay (useKkiaPay.ts)`

### Bugs corrigés dans cette mise à jour

- Correction du loader de script pour éviter un faux positif quand le script existe déjà mais n'est pas encore chargé
- Correction de `usePaymentStatus` pour arrêter proprement après `maxAttempts`, y compris en cas d'erreurs réseau répétées
- Correction de `usePaymentHistory` pour recharger correctement l'historique quand `storage` ou `storageKey` changent
- Correction des callbacks de `useBeninPay` pour ne plus écraser silencieusement les callbacks FedaPay existants
- Transmission correcte de la configuration de vérification KKiaPay dans le hook unifié
- Harmonisation de la doc et des types FedaPay pour éviter les incohérences d'intégration

### Nouvelles fonctionnalités

- `usePaymentHistory` — Historique des paiements en mémoire, session ou localStorage
- `<PaymentStatusBadge />` — Composant visuel pour afficher le statut d'un paiement
- `onBeforePayment` — Pré-validation asynchrone avant ouverture du widget
- `useBeninPay.lastTransaction` — Dernière transaction réussie exposée directement
- `Événements Analytics` — Événements standardisés compatibles PostHog, Mixpanel, etc.
- `Améliorations Architecturales` — sous-entrées `fedapay` / `kkiapay` pour un meilleur tree-shaking
- `React 19 / RSC` — marqueurs `"use client"` explicites sur les modules React exposés
- `usePaymentStatus` — support WebSocket en plus du polling

---

## Avant / Après

### Intégration manuelle (méthode classique)

```tsx
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://cdn.fedapay.com/checkout.js?v=1.1.7";
  script.async = true;
  script.onload = () => setScriptLoaded(true);
  script.onerror = () => setError("Failed to load");
  document.body.appendChild(script);

  return () => document.body.removeChild(script);
}, []);

if (!scriptLoaded) return <p>Chargement...</p>;

const handlePayment = () => {
  if (!window.FedaPay) {
    alert("SDK non chargé !");
    return;
  }

  const checkout = window.FedaPay.init({
    public_key: "pk_live_XXXXX",
    transaction: { amount: 5000 },
    onComplete: async (response) => {
      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ transactionId: response.transaction.id }),
        });
        // ...
      } catch (err) {
        alert(err.message);
      }
    },
  });

  checkout.open();
};
```

**Problèmes :** 30+ lignes de boilerplate, clés API répétées, gestion d'erreurs manuelle, pas de types TypeScript.

---

### Avec react-benin-payments

```tsx
import { FedaPayButton, BeninPaymentProvider } from "react-benin-payments";

function App() {
  return (
    <BeninPaymentProvider fedaPayPublicKey="pk_live_XXXXX">
      <MyApp />
    </BeninPaymentProvider>
  );
}

function PaymentPage() {
  return (
    <FedaPayButton
      config={{
        transaction: { amount: 5000 },
        verifyUrl: "/api/verify",
        onComplete: (response) => console.log("Paiement vérifié !"),
      }}
      className="bg-green-600 text-white px-6 py-3 rounded-lg"
      text="Payer 5 000 FCFA"
    />
  );
}
```

**Avantages :** 5 lignes, configuration centralisée, vérification backend automatique, types TypeScript complets, compatible Next.js App Router.

---

## Installation

```bash
npm install react-benin-payments
```

```bash
yarn add react-benin-payments
```

**Peer Dependencies :** `react >= 17.0.0`, `react-dom >= 17.0.0`

### Imports séparés pour un meilleur tree-shaking

Si vous n'utilisez qu'un seul provider, vous pouvez importer uniquement son entrypoint dédié:

```tsx
import { FedaPayButton, useFedaPay } from "react-benin-payments/fedapay";
```

```tsx
import { KkiaPayButton, useKkiaPay } from "react-benin-payments/kkiapay";
```

L'entrée racine `react-benin-payments` reste disponible pour les usages mixtes ou pour `useBeninPay`.

---

## Quick Start

### 1. Configurez le Provider

```tsx
// app/layout.tsx (Next.js) ou App.tsx (React)
import { BeninPaymentProvider } from "react-benin-payments";

export default function RootLayout({ children }) {
  return (
    <BeninPaymentProvider
      fedaPayPublicKey={process.env.NEXT_PUBLIC_FEDAPAY_KEY}
      kkiaPayPublicKey={process.env.NEXT_PUBLIC_KKIAPAY_KEY}
      defaultCurrency="XOF"
      isTestMode={process.env.NODE_ENV === "development"}
    >
      {children}
    </BeninPaymentProvider>
  );
}
```

### 2. Utilisez un composant de paiement

```tsx
import { FedaPayButton } from "react-benin-payments";

export function DonationButton() {
  return (
    <FedaPayButton
      config={{
        transaction: { amount: 10000, description: "Don pour le projet" },
        customer: { email: "donateur@example.com" },
        onComplete: (response) => console.log("Merci !", response),
      }}
      className="bg-emerald-600 text-white px-8 py-4 rounded-xl"
      text="Faire un don de 10 000 FCFA"
    />
  );
}
```

---

## Exemples d'utilisation

### Hook personnalisé (Headless)

```tsx
import { useFedaPay } from "react-benin-payments";

function CustomPaymentUI() {
  const { openDialog, loading, error, isVerifying } = useFedaPay({
    transaction: { amount: 5000 },
    verifyUrl: "/api/payments/verify",
    onComplete: (response) => router.push("/dashboard"),
  });

  if (error) return <ErrorBanner message={error.message} />;

  return (
    <button onClick={openDialog} disabled={loading || isVerifying}>
      {loading && "Chargement..."}
      {isVerifying && "Vérification..."}
      {!loading && !isVerifying && "Payer maintenant"}
    </button>
  );
}
```

### Pré-validation avant paiement avec `onBeforePayment`

```tsx
import { useFedaPay } from "react-benin-payments";

function CheckoutButton() {
  const { openDialog, isPreparing, isVerifying } = useFedaPay(
    {
      transaction: { amount: 5000, description: "Commande #2025" },
    },
    {
      onBeforePayment: async () => {
        const stockOk = await fetch("/api/stock/check").then((res) => res.json());

        if (!stockOk.available) {
          throw new Error("Produit indisponible");
        }

        await fetch("/api/analytics/payment-intent", { method: "POST" });
      },
    }
  );

  return (
    <button onClick={openDialog} disabled={isPreparing || isVerifying}>
      {isPreparing ? "Préparation..." : "Payer"}
    </button>
  );
}
```

### KKiaPay

```tsx
import { KkiaPayButton } from "react-benin-payments";

function MobileMoneyPayment() {
  return (
    <KkiaPayButton
      config={{
        amount: 2500,
        name: "Jean Dupont",
        phone: "22967000000",
        paymentMethods: ["momo"],
      }}
      onSuccess={(data) => console.log("Transaction:", data.transactionId)}
      verifyUrl="/api/kkiapay/verify"
      text="Payer avec Mobile Money"
    />
  );
}
```

### Hook universel

```tsx
import { useBeninPay } from "react-benin-payments";

function FlexiblePayment() {
  const preferredProvider = getUserPreference() || "fedapay";

  const { pay, loading, isReady, provider, lastTransaction } = useBeninPay(
    {
      provider: preferredProvider,
      fedapay: { transaction: { amount: 5000 } },
      kkiapay: { amount: 5000 },
    },
    {
      onSuccess: (result) =>
        console.log(`Payé via ${provider}:`, result.transactionId),
    }
  );

  return (
    <div>
      <button onClick={pay} disabled={!isReady || loading}>
        Payer avec {provider === "fedapay" ? "FedaPay" : "KKiaPay"}
      </button>

      {lastTransaction && (
        <p>
          Dernière transaction: {lastTransaction.transactionId} ({lastTransaction.amount} FCFA)
        </p>
      )}
    </div>
  );
}
```

### Historique des paiements avec `usePaymentHistory`

```tsx
import { useBeninPay, usePaymentHistory, formatXOF } from "react-benin-payments";

function PaymentsWithHistory() {
  const { addToHistory, history, totalPaid } = usePaymentHistory({
    storage: "session",
    maxEntries: 20,
  });

  const { pay } = useBeninPay(
    {
      provider: "fedapay",
      fedapay: { transaction: { amount: 5000 } },
    },
    {
      mock: true,
      onSuccess: (result) => addToHistory(result, "fedapay"),
    }
  );

  return (
    <div>
      <button onClick={pay}>Payer</button>
      <p>Total payé: {formatXOF(totalPaid)}</p>
      <ul>
        {history.map((entry) => (
          <li key={entry.transactionId}>
            {entry.transactionId} — {formatXOF(entry.amount)} — {entry.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Statut visuel avec `<PaymentStatusBadge />`

```tsx
import { PaymentStatusBadge } from "react-benin-payments";

function PaymentRow() {
  return (
    <div className="flex items-center gap-3">
      <span>Commande #123</span>
      <PaymentStatusBadge status="approved" />
    </div>
  );
}
```

### Analytics standardisés

```tsx
import { useBeninPay } from "react-benin-payments";

function AnalyticsExample() {
  const { pay } = useBeninPay(
    {
      provider: "kkiapay",
      kkiapay: { amount: 5000, name: "Jean Dupont" },
    },
    {
      onAnalyticsEvent: (event) => {
        posthog.capture(event.name, event);
      },
    }
  );

  return <button onClick={pay}>Payer</button>;
}
```

### Suivi temps réel avec `usePaymentStatus` en WebSocket

```tsx
import { usePaymentStatus, PaymentStatusBadge } from "react-benin-payments";

function LivePaymentStatus({ transactionId }: { transactionId: string }) {
  const { status, isPolling } = usePaymentStatus({
    transport: "websocket",
    websocketUrl: `wss://api.example.com/payments/status?transactionId=${transactionId}`,
    transactionId,
    provider: "fedapay",
  });

  return (
    <div>
      <PaymentStatusBadge status={status} />
      {isPolling && <p>Écoute des mises à jour en temps réel...</p>}
    </div>
  );
}
```

---

## Vérification Backend

### Client

```tsx
<FedaPayButton
  config={{
    transaction: { amount: 5000 },
    verifyUrl: "/api/payments/verify",
    customVerifyHeaders: { Authorization: `Bearer ${token}` },
    onComplete: (response) => {
      // Appelé après vérification backend réussie
    },
  }}
/>
```

### Serveur (Next.js API Route)

```typescript
// app/api/payments/verify/route.ts
export async function POST(request: NextRequest) {
  const { transactionId, amount, provider } = await request.json();

  const isValid = await verifyWithProvider(transactionId, provider);

  if (isValid) {
    await db.orders.update({
      where: { transactionId },
      data: { status: "paid" },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false }, { status: 400 });
}
```

---

## Référence des Props

### BeninPaymentProvider

| Prop               | Type                      | Default | Description             |
| ------------------ | ------------------------- | ------- | ----------------------- |
| `fedaPayPublicKey` | `string`                  | -       | Clé publique FedaPay    |
| `kkiaPayPublicKey` | `string`                  | -       | Clé publique KKiaPay    |
| `defaultCurrency`  | `'XOF' \| 'USD' \| 'EUR'` | `'XOF'` | Devise par défaut       |
| `isTestMode`       | `boolean`                 | `false` | Force le mode sandbox   |
| `debug`            | `boolean`                 | `false` | Active les logs console |

### FedaPayButton / KkiaPayButton

| Prop            | Type     | Default             | Description                   |
| --------------- | -------- | ------------------- | ----------------------------- |
| `config`        | `object` | required            | Configuration du paiement     |
| `text`          | `string` | `'Payer'`           | Texte du bouton               |
| `loadingText`   | `string` | `'Chargement...'`   | Texte pendant le chargement   |
| `verifyingText` | `string` | `'Vérification...'` | Texte pendant la vérification |

### Configuration de paiement

| Prop                      | Type       | Description                 |
| ------------------------- | ---------- | --------------------------- |
| `transaction.amount`      | `number`   | Montant (5000 = 5000 FCFA)  |
| `transaction.description` | `string`   | Description du paiement     |
| `customer.email`          | `string`   | Email du client             |
| `sandbox`                 | `boolean`  | Mode test                   |
| `verifyUrl`               | `string`   | URL de vérification backend |
| `customVerifyHeaders`     | `object`   | Headers personnalisés       |
| `onComplete`              | `function` | Callback de succès          |
| `onClose`                 | `function` | Callback de fermeture       |

---

## Utilitaires

```typescript
import { formatXOF, formatCurrency, parseError } from "react-benin-payments";

formatXOF(5000); // "5 000 FCFA"
formatCurrency(100, "USD"); // "$100.00"
parseError("Network failed"); // "Problème de connexion internet."
```

---

## Licence

MIT © 2024 Steven KOULO

---

Made with care in Benin by **Steven KOULO**
