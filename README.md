# react-benin-payments

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Size](https://img.shields.io/badge/size-27.4kb-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)
![Next.js](https://img.shields.io/badge/Next.js-13%2F14%2F15-black.svg)

**L'intégration la plus simple de FedaPay et KKiaPay pour React & Next.js.**

Gère automatiquement le chargement des scripts, les modales de paiement et la vérification backend.

**[Documentation complète](./docs/DOCUMENTATION.md)** | [Exemple d'application](./example)

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

## Documentation

Guide complet disponible dans le dossier [`docs`](./docs/DOCUMENTATION.md) :

1. [Introduction](./docs/01-introduction.md)
2. [Installation](./docs/02-installation.md)
3. [Configuration](./docs/03-configuration.md)
4. [Utilisation de base](./docs/04-basic-usage.md)
5. [Utilisation avancée](./docs/05-advanced-usage.md)
6. [Référence API](./docs/06-api-reference.md)
7. [Utilitaires](./docs/07-utilities.md)
8. [Gestion des erreurs](./docs/08-error-handling.md)
9. [Mode Test](./docs/09-test-mode.md)
10. [FAQ](./docs/10-faq.md)

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

  const checkout = window.FedaPay.init("#container", {
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

  const { pay, loading, isReady, provider } = useBeninPay(
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
    <button onClick={pay} disabled={!isReady || loading}>
      Payer avec {provider === "fedapay" ? "FedaPay" : "KKiaPay"}
    </button>
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
