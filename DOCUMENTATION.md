# Documentation react-benin-payments

Guide complet pour intégrer les paiements FedaPay et KKiaPay dans vos applications React et Next.js.

---

## Table des matières

1. [Introduction](#introduction)
2. [Nouveautés et corrections](#nouveautés-et-corrections)
3. [Installation](#installation)
4. [Configuration initiale](#configuration-initiale)
5. [Utilisation de base](#utilisation-de-base)
6. [Utilisation avancée](#utilisation-avancée)
7. [Génération de reçus PDF](#génération-de-reçus-pdf)
8. [Créer un provider personnalisé](#créer-un-provider-personnalisé)
9. [Référence API](#référence-api)
10. [Utilitaires](#utilitaires)
11. [Gestion des erreurs](#gestion-des-erreurs)
12. [Mode Test et Production](#mode-test-et-production)
13. [FAQ](#faq)

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

## Nouveautés et corrections

L'historique détaillé des versions (ajouts, corrections, changements) vit dans **[CHANGELOG.md](./CHANGELOG.md)**.

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

### Imports séparés pour un meilleur tree-shaking

Si vous n'utilisez qu'un seul provider, vous pouvez importer uniquement son entrypoint dédié :

```tsx
import { FedaPayButton, useFedaPay } from "react-benin-payments/fedapay";
```

```tsx
import { KkiaPayButton, useKkiaPay } from "react-benin-payments/kkiapay";
```

L'entrée racine `react-benin-payments` reste la meilleure option pour `useBeninPay` ou pour les projets qui utilisent les deux providers.

### Vérification de l'installation

```tsx
import { BeninPaymentProvider, FedaPayButton } from "react-benin-payments";

// Si pas d'erreur, l'installation est réussie
```

### Configuration rapide via CLI

Un assistant en ligne de commande peut générer le fichier d'environnement et le composant provider pour vous :

```bash
npx react-benin-payments init
```

Il vous demande : le(s) provider(s) à utiliser, le mode sandbox, et l'outil de build de votre projet (Next.js, Vite, Create React App, ou aucun préfixe particulier) — pour générer un `.env.example` et un composant `PaymentProviders` avec la bonne convention de variables d'environnement (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`...). Il ne génère **pas** de route API : la vérification backend dépend de votre framework serveur, voir [Vérification Backend](./README.md#vérification-backend).

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
    isPreparing, // true pendant la pré-validation
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
      onBeforePayment: async () => {
        const response = await fetch("/api/stock/check");
        const data = await response.json();

        if (!data.available) {
          throw new Error("Produit indisponible");
        }
      },
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
        disabled={!scriptLoaded || isVerifying || isPreparing}
        className="w-full bg-green-600 text-white py-3 rounded-lg disabled:opacity-50"
      >
        {isPreparing && "Préparation..."}
        {!isPreparing && isVerifying && "Vérification en cours..."}
        {!isPreparing && !isVerifying && "Procéder au paiement"}
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
    lastTransaction,
    isPreparing,
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
      onBeforePayment: async () => {
        await fetch("/api/audit/payment-intent", { method: "POST" });
      },
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
        disabled={!isReady || loading || isVerifying || isPreparing}
        className="w-full bg-black text-white py-3 rounded-lg"
      >
        {loading && "Chargement..."}
        {isPreparing && "Préparation..."}
        {isVerifying && "Vérification..."}
        {!loading &&
          !isPreparing &&
          !isVerifying &&
          `Payer avec ${currentProvider}`}
      </button>

      {lastTransaction && (
        <p className="mt-3 text-sm text-gray-600">
          Dernière transaction : {lastTransaction.transactionId} ({lastTransaction.amount} FCFA)
        </p>
      )}
    </div>
  );
}
```

### Historique des paiements avec usePaymentHistory

```tsx
import {
  useBeninPay,
  usePaymentHistory,
  PaymentStatusBadge,
  formatXOF,
} from "react-benin-payments";

function PaymentHistoryExample() {
  const { history, addToHistory, totalPaid } = usePaymentHistory({
    storage: "session",
    maxEntries: 20,
  });

  const { pay } = useBeninPay(
    {
      provider: "fedapay",
      fedapay: {
        transaction: { amount: 5000, description: "Commande #456" },
      },
    },
    {
      mock: true,
      onSuccess: (result) => addToHistory(result, "fedapay"),
    }
  );

  return (
    <div className="space-y-4">
      <button onClick={pay}>Simuler un paiement</button>

      <p>Total payé : {formatXOF(totalPaid)}</p>

      <ul className="space-y-2">
        {history.map((entry) => (
          <li key={entry.transactionId} className="flex items-center gap-3">
            <span>{entry.transactionId}</span>
            <PaymentStatusBadge status={entry.status === "success" ? "approved" : "pending"} />
            <span>{formatXOF(entry.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Analytics standardisés

```tsx
import { BeninPaymentProvider } from "react-benin-payments";

function App({ children }: { children: React.ReactNode }) {
  return (
    <BeninPaymentProvider
      onAnalyticsEvent={(event) => {
        posthog.capture(event.name, event);
      }}
    >
      {children}
    </BeninPaymentProvider>
  );
}
```

### Suivi en temps réel avec WebSocket

```tsx
import { usePaymentStatus, PaymentStatusBadge } from "react-benin-payments";

function LiveStatus({ transactionId }: { transactionId: string }) {
  const { status, isPolling } = usePaymentStatus({
    transport: "websocket",
    websocketUrl: `wss://api.example.com/payments/status?transactionId=${transactionId}`,
    transactionId,
    provider: "fedapay",
  });

  return (
    <div className="space-y-2">
      <PaymentStatusBadge status={status} />
      {isPolling && <p>Connexion temps réel active...</p>}
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

## Génération de reçus PDF

Le hook `usePaymentReceipt` génère des reçus PDF directement dans le navigateur (côté client, sans serveur), avec un design minimaliste par défaut (une fine bande de couleur, des séparateurs discrets, une hiérarchie typographique claire). Le design, les textes et la numérotation sont entièrement contrôlés par votre configuration, et le générateur par défaut peut être remplacé par le vôtre via `renderPdf`.

Le générateur par défaut s'appuie sur [jsPDF](https://github.com/parallax/jsPDF), chargé **à la demande** — jsPDF est une *peer dependency optionnelle* : `npm install jspdf` seulement si vous utilisez `usePaymentReceipt` sans fournir `renderPdf`. Les projets qui n'utilisent que `useFedaPay`/`useKkiaPay` n'installent jamais jsPDF.

### Cas d'usage courants

| Méthode | Description |
|---|---|
| `generateAndDownload(data)` | Génère et déclenche le téléchargement PDF |
| `generateBlob(data)` | Génère et retourne le Blob (upload, prévisualisation) |
| `generateDataUrl(data)` | Génère et retourne le data URL base64 (affichage `<iframe>`) |
| `sendByEmail(to, data)` | Génère et envoie par email via votre service |

### Usage basique

```tsx
import { useFedaPay, usePaymentReceipt } from "react-benin-payments";

function CheckoutButton() {
  const { generateAndDownload } = usePaymentReceipt({
    appName: "MonShop",
    footerNote: "Merci pour votre achat !",
  });

  const { openDialog } = useFedaPay({
    transaction: { amount: 5000, description: "Abonnement Premium" },
    onComplete: (response) => {
      generateAndDownload({
        transactionId: response.transaction.reference,
        amount: response.transaction.amount,
        status: "Approuvé",
        provider: "fedapay",
      });
    },
  });

  return <button onClick={openDialog}>Payer</button>;
}
```

### Design personnalisé

```tsx
const { generateAndDownload } = usePaymentReceipt({
  // Branding
  appName: "MonShop",
  logo: "/logo.png",            // URL publique ou image base64 (PNG / JPEG)
  appDescription: "Boutique en ligne",
  appAddress: "Cotonou, Bénin",
  appEmail: "contact@monshop.bj",
  appPhone: "+229 97 00 00 00",
  appWebsite: "https://monshop.bj",

  // Couleurs (valeurs hex)
  primaryColor: "#22C55E",      // bande de titre, barre total, accents
  secondaryColor: "#F0FDF4",    // fond des lignes alternées du tableau
  textColor: "#14532D",         // texte principal

  // Locale et devise
  locale: "fr-BJ",
  currency: "XOF",

  // Libellés personnalisés (tous optionnels)
  labels: {
    receiptTitle: "FACTURE",
    totalLabel: "MONTANT TOTAL",
    thankYouNote: "Paiement reçu avec succès.",
  },

  // Pied de page
  footerNote: "Conservez ce document comme preuve de paiement.",

  // Nom du fichier téléchargé
  filename: (data) => `facture-${data.transactionId}`,
});
```

### Numérotation des factures

```tsx
const { generateAndDownload } = usePaymentReceipt({
  invoicePrefix: "FAC-",                               // préfixe fixe
  invoiceNumber: 1042,                                 // statique → "FAC-1042"

  // OU dynamique (recommandé en production)
  invoiceNumber: (data) => `FAC-${data.transactionId.slice(-6).toUpperCase()}`,
});
```

### Champs personnalisés

```tsx
const { generateAndDownload } = usePaymentReceipt({
  extraFields: [
    { label: "Référence commande",  value: "ORD-456" },
    { label: "Vendeur",             value: "Agence Nord" },
    { label: "TVA (18%)",           value: (data) => `${(data.amount * 0.18).toFixed(0)} XOF` },
    { label: "Canal",               value: "Mobile Money" },
  ],
});
```

### Données de transaction complètes

```tsx
generateAndDownload({
  transactionId: "TXN-ABC123",    // affiché sur le reçu (obligatoire)
  amount: 5000,                    // montant (obligatoire)
  currency: "XOF",                 // remplace config.currency si fourni
  status: "Approuvé",             // libellé du statut
  date: new Date(),                // date (défaut: maintenant)
  provider: "fedapay",            // "fedapay" ou "kkiapay"

  // Informations client (section "À")
  customerName: "Jean Dupont",
  customerEmail: "jean@example.com",
  customerPhone: "+229 97 00 00 00",

  // Détails de la prestation
  serviceName: "Abonnement Premium",
  description: "Accès 12 mois — Plan Pro",

  // Métadonnées (non affichées, disponibles dans onGenerated)
  metadata: { orderId: "ORD-001", userId: "u_42" },
});
```

### Envoi par email — Mode fonction

Utilisez cette approche avec **Resend, SendGrid, Nodemailer** ou tout service de votre choix.

```tsx
const { sendByEmail } = usePaymentReceipt({
  appName: "MonShop",
  email: {
    sendFn: async ({ to, subject, pdfBase64, filename }) => {
      // Exemple avec Resend
      await resend.emails.send({
        from: "no-reply@monshop.bj",
        to,
        subject,
        attachments: [{ filename, content: pdfBase64 }],
      });
    },
    subject: (data) => `Votre reçu — ${data.transactionId}`,
  },
});

// Dans le callback onComplete
sendByEmail("client@example.com", {
  transactionId: "TXN-ABC123",
  amount: 5000,
  customerName: "Jean Dupont",
});
```

### Envoi par email — Mode URL (backend)

Déléguez l'envoi à votre backend via un simple endpoint HTTP.

```tsx
const { sendByEmail } = usePaymentReceipt({
  email: {
    sendUrl: "/api/send-receipt",
    sendHeaders: { Authorization: `Bearer ${token}` },
    subject: "Votre reçu de paiement",
    bodyHtml: (data) => `
      <h1>Merci !</h1>
      <p>Transaction <strong>${data.transactionId}</strong> confirmée.</p>
    `,
  },
});
```

Le corps JSON envoyé à `sendUrl` :

```json
{
  "to": "client@example.com",
  "subject": "Votre reçu de paiement",
  "pdfBase64": "JVBERi0xLjQ...",
  "filename": "recu-TXN-ABC123.pdf",
  "bodyHtml": "<h1>Merci !</h1>...",
  "bodyText": null,
  "transactionData": { "transactionId": "TXN-ABC123", "amount": 5000 }
}
```

Exemple d'endpoint Next.js :

```typescript
// app/api/send-receipt/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { to, subject, pdfBase64, filename, bodyHtml } = await req.json();

  // Avec Resend, SendGrid, Nodemailer, etc.
  await mailer.send({
    to,
    subject,
    html: bodyHtml,
    attachments: [{ filename, content: Buffer.from(pdfBase64, "base64") }],
  });

  return NextResponse.json({ ok: true });
}
```

### Prévisualisation dans le navigateur

```tsx
import { useState } from "react";
import { usePaymentReceipt } from "react-benin-payments";

function ReceiptPreview({ transactionData }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { generateDataUrl, isGenerating } = usePaymentReceipt({
    appName: "MonShop",
  });

  const handlePreview = async () => {
    const url = await generateDataUrl(transactionData);
    if (url) setPdfUrl(url);
  };

  return (
    <div>
      <button onClick={handlePreview} disabled={isGenerating}>
        {isGenerating ? "Génération..." : "Prévisualiser le reçu"}
      </button>
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          className="w-full h-[600px] border rounded-lg mt-4"
          title="Reçu de paiement"
        />
      )}
    </div>
  );
}
```

### Callback `onGenerated`

```tsx
const { generateBlob } = usePaymentReceipt({
  appName: "MonShop",
  autoDownload: false,              // ne pas télécharger automatiquement
  onGenerated: async (blob, dataUrl) => {
    // Uploader sur votre serveur
    const form = new FormData();
    form.append("receipt", blob, "recu.pdf");
    await fetch("/api/receipts/upload", { method: "POST", body: form });
  },
});
```

### Remplacer le PDF par défaut (`renderPdf`)

Si vous avez déjà votre propre template (une autre librairie que jsPDF, une génération côté serveur, un design maison), fournissez `renderPdf` : il remplace entièrement le générateur par défaut, et jsPDF n'est alors **jamais chargé**. Le reste de `usePaymentReceipt` (téléchargement, data URL, envoi par email) continue de fonctionner à l'identique à partir du `Blob` que vous retournez.

```tsx
const { generateAndDownload, sendByEmail } = usePaymentReceipt({
  renderPdf: async (data) => {
    // Votre propre génération — une autre librairie, un appel serveur, etc.
    const blob = await monGenerateurDeFactureMaison(data);
    return { blob, filename: `facture-${data.transactionId}` };
  },
});
```

`renderPdf` peut être synchrone ou asynchrone. Si vous omettez `filename`, la même résolution que le générateur par défaut s'applique (`config.filename`, sinon `recu-${transactionId}`).

### Intégration complète avec useBeninPay

```tsx
import { useBeninPay, usePaymentReceipt, usePaymentHistory } from "react-benin-payments";

function FullCheckout() {
  const { addToHistory } = usePaymentHistory({ storage: "local" });

  const { generateAndDownload, sendByEmail } = usePaymentReceipt({
    appName: "MonShop",
    primaryColor: "#4E6BFF",
    invoicePrefix: "FAC-",
    email: {
      sendFn: async ({ to, pdfBase64, filename }) => {
        await fetch("/api/send-receipt", {
          method: "POST",
          body: JSON.stringify({ to, pdfBase64, filename }),
        });
      },
    },
  });

  const { pay, loading } = useBeninPay(
    {
      provider: "fedapay",
      fedapay: {
        transaction: { amount: 5000, description: "Commande #123" },
        customer: { email: "jean@example.com" },
      },
    },
    {
      onSuccess: async (result) => {
        // 1. Enregistre dans l'historique
        addToHistory(result, "fedapay");

        const receiptData = {
          transactionId: result.transactionId,
          amount: result.amount,
          status: "Approuvé",
          customerEmail: "jean@example.com",
          serviceName: "Commande #123",
          provider: "fedapay" as const,
        };

        // 2. Télécharge le reçu
        await generateAndDownload(receiptData);

        // 3. Envoie par email
        await sendByEmail("jean@example.com", receiptData);
      },
    }
  );

  return (
    <button onClick={pay} disabled={loading}>
      Payer
    </button>
  );
}
```

---

## Créer un provider personnalisé

`useFedaPay` et `useKkiaPay` sont tous les deux de fines couches React posées sur le **même moteur de paiement**, qui n'a lui-même aucune dépendance à FedaPay, KKiaPay, ni même à React. Ce moteur est exposé séparément via `react-benin-payments/core`, pour brancher **n'importe quel prestataire de paiement** que le package ne fournit pas — CinetPay, PayDunya, Stripe, MTN MoMo direct, la passerelle interne d'une banque — dans n'importe quel type de projet (e-commerce, SaaS, plateforme de dons, marketplace...).

En implémentant un `PaymentDriver`, vous obtenez gratuitement : chargement de script, mode mock, `onBeforePayment`, vérification backend et événements analytics standardisés — exactement la même mécanique que `useFedaPay`/`useKkiaPay`.

### 1. Écrire le driver

Un driver décrit uniquement ce qui est spécifique au provider : comment valider sa config, simuler un paiement en mode mock, et ouvrir son widget/SDK.

```ts
// monpay-driver.ts
import type { PaymentDriver } from "react-benin-payments/core";
import { generateMockTransactionId } from "react-benin-payments/core";

interface MonPayConfig {
  apiKey: string;
  amount: number;
  customerEmail?: string;
}

interface MonPaySuccess {
  reference: string;
  amount: number;
}

export function createMonPayDriver(): PaymentDriver<MonPayConfig, MonPaySuccess> {
  return {
    name: "monpay",
    scriptUrl: "https://cdn.monpay.example/sdk.js",
    scriptId: "monpay-sdk-script",

    isSdkReady: () => typeof window !== "undefined" && !!window.MonPay,

    validate: (config) => {
      if (!config.apiKey) return { code: "MISSING_PUBLIC_KEY", message: "Clé API MonPay manquante." };
      if (!config.amount || config.amount <= 0) return { code: "INVALID_AMOUNT", message: "Montant invalide." };
      return null;
    },

    getAmount: (config) => config?.amount,

    buildMockSuccess: (config) => ({
      reference: generateMockTransactionId(),
      amount: config.amount,
    }),

    toVerifyPayload: (raw) => ({ transactionId: raw.reference, amount: raw.amount }),

    open: (config, handlers) => {
      window.MonPay!.checkout({
        apiKey: config.apiKey,
        amount: config.amount,
        email: config.customerEmail,
        onSuccess: (data: MonPaySuccess) => handlers.onSuccess(data),
        onCancel: () => handlers.onClose(),
      });
    },
  };
}
```

### 2. L'utiliser dans un hook React

```tsx
"use client";

import { usePaymentEngine } from "react-benin-payments/core";
import { createMonPayDriver } from "./monpay-driver";

const monPayDriver = createMonPayDriver();

export function useMonPay(config: { apiKey: string; amount: number }, options: { onSuccess?: (r: unknown) => void } = {}) {
  const [state, open] = usePaymentEngine(monPayDriver, () => ({
    isMockMode: process.env.NODE_ENV === "test",
    onRawSuccess: options.onSuccess,
  }));

  return { ...state, pay: () => open(config) };
}
```

`useMonPay` se comporte alors exactement comme `useFedaPay` : `loading`, `scriptLoaded`, `isVerifying`, `isPreparing`, mode mock automatique en test, et les mêmes événements analytics (`payment_opened`, `payment_completed`, `payment_failed`...) avec `provider: "monpay"` — utilisable côté e-commerce (checkout), SaaS (page de facturation) ou don (formulaire de don) sans rien réécrire.

### Utilisation sans React

`createPaymentEngine` n'a aucune dépendance à React — il expose `subscribe`/`getState`/`open` bruts, utilisables depuis n'importe quelle couche UI (Vue, Svelte, vanilla JS) :

```ts
import { createPaymentEngine } from "react-benin-payments/core";
import { createMonPayDriver } from "./monpay-driver";

const engine = createPaymentEngine(createMonPayDriver(), () => ({
  isMockMode: false,
  onRawSuccess: (data) => console.log("Payé !", data),
}));

engine.start();
engine.subscribe(() => console.log("État :", engine.getState()));
engine.open({ apiKey: "sk_xxx", amount: 5000 });
```

### Ce qui est exporté par `react-benin-payments/core`

| Export | Rôle |
| --- | --- |
| `createPaymentEngine(driver, getOptions)` | Le moteur framework-agnostic |
| `usePaymentEngine(driver, getOptions)` | Binding React (utilisé en interne par `useFedaPay`/`useKkiaPay`) |
| `PaymentDriver<TConfig, TRaw>` | Le contrat à implémenter pour un nouveau provider |
| `loadScript`, `createLogger`, `verifyTransaction`, `validateKeyEnvironment`, `logSandboxMode`, `generateMockTransactionId` | Briques utilitaires internes, réutilisables pour écrire un driver |

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

  // Callback global pour les événements analytics standardisés
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
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
| `onBeforePayment`| `() => Promise<void \| boolean>` | -     | Pré-validation avant ouverture |
| `onAnalyticsEvent` | `(event) => void` | -                  | Événements analytics standardisés |
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
| `onBeforePayment`     | `() => Promise<void \| boolean>` | -    | Pré-validation avant ouverture |
| `onAnalyticsEvent`    | `(event) => void` | -                   | Événements analytics standardisés |
| `verifyUrl`           | `string`           | -                   | URL de vérification backend   |
| `customVerifyHeaders` | `object`           | -                   | Headers personnalisés         |

### PaymentStatusBadge

| Prop            | Type                          | Défaut | Description |
| --------------- | ----------------------------- | ------ | ----------- |
| `status`        | `TransactionStatus`           | required | Statut affiché |
| `labels`        | `Partial<Record<status,node>>` | -    | Libellés personnalisés |
| `statusClasses` | `Partial<Record<status,string>>` | - | Classes CSS par statut |
| `unstyled`      | `boolean`                     | `false` | Désactive les styles inline |

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
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  onError?: (error: PaymentValidationError) => void;
}

interface UseFedaPayReturn {
  openDialog: () => void;
  loading: boolean;
  error: Error | null;
  scriptLoaded: boolean;
  isMockMode: boolean;
  isVerifying: boolean;
  isPreparing: boolean;
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
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
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
  isPreparing: boolean;
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
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
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
  isPreparing: boolean;
  lastTransaction: UnifiedPaymentResult | null;
}
```

### usePaymentStatus

```tsx
type PaymentStatusTransport = "polling" | "websocket";

interface UsePaymentStatusOptions {
  checkUrl?: string;
  transactionId: string;
  provider: "fedapay" | "kkiapay";
  transport?: PaymentStatusTransport;
  pollInterval?: number;
  maxAttempts?: number;
  customHeaders?: Record<string, string>;
  websocketUrl?: string;
  websocketProtocols?: string | string[];
  websocketFactory?: (
    url: string,
    protocols?: string | string[]
  ) => PaymentStatusWebSocketLike;
  parseWebSocketMessage?: (
    event: MessageEvent
  ) => TransactionStatus | { status?: TransactionStatus } | null | undefined;
  onStatusChange?: (status: TransactionStatus) => void;
  enabled?: boolean;
  debug?: boolean;
}
```

### usePaymentHistory

```tsx
interface UsePaymentHistoryOptions {
  storage?: "memory" | "session" | "local";
  storageKey?: string;
  maxEntries?: number;
}

interface PaymentHistoryEntry extends UnifiedPaymentResult {
  recordedAt: string;
  provider?: "fedapay" | "kkiapay";
}
```

### usePaymentReceipt

```tsx
function usePaymentReceipt(config?: ReceiptConfig): UsePaymentReceiptReturn;

interface UsePaymentReceiptReturn {
  /** Génère le PDF et déclenche le téléchargement dans le navigateur */
  generateAndDownload: (data: ReceiptTransactionData) => Promise<GenerateReceiptResult | null>;

  /** Génère le PDF sans téléchargement — retourne le Blob */
  generateBlob: (data: ReceiptTransactionData) => Promise<Blob | null>;

  /** Génère le PDF sans téléchargement — retourne le data URL base64 */
  generateDataUrl: (data: ReceiptTransactionData) => Promise<string | null>;

  /** Génère et envoie par email (nécessite config.email) */
  sendByEmail: (to: string, data: ReceiptTransactionData) => Promise<void>;

  /** true pendant la génération du PDF */
  isGenerating: boolean;

  /** true pendant l'envoi de l'email */
  isSending: boolean;

  /** Dernière erreur survenue */
  error: Error | null;

  /** Efface l'erreur courante */
  clearError: () => void;
}

interface ReceiptTransactionData {
  transactionId: string;           // Identifiant de la transaction (obligatoire)
  amount: number;                  // Montant (obligatoire)
  currency?: "XOF" | "USD" | "EUR";
  status?: string;                 // Ex: "Approuvé", "Succès"
  date?: string | Date;            // Défaut : maintenant
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
  description?: string;
  provider?: "fedapay" | "kkiapay";
  metadata?: Record<string, unknown>;
}

interface ReceiptConfig {
  // ── Branding ──────────────────────────────────────────────────────────
  logo?: string;                   // URL ou base64 PNG/JPEG
  appName?: string;
  appDescription?: string;
  appAddress?: string;
  appEmail?: string;
  appPhone?: string;
  appWebsite?: string;

  // ── Numérotation ──────────────────────────────────────────────────────
  invoicePrefix?: string;          // Défaut: "FAC-"
  invoiceNumber?: string | number | ((data: ReceiptTransactionData) => string | number);

  // ── Champs supplémentaires ────────────────────────────────────────────
  extraFields?: ReceiptField[];    // Lignes additionnelles dans le tableau

  // ── Design ────────────────────────────────────────────────────────────
  primaryColor?: string;           // Hex — défaut: "#4E6BFF"
  secondaryColor?: string;         // Hex — défaut: "#EEF2FF"
  textColor?: string;              // Hex — défaut: "#1A1A2E"

  // ── Localisation ──────────────────────────────────────────────────────
  locale?: string;                 // BCP 47 — défaut: "fr-BJ"
  currency?: "XOF" | "USD" | "EUR";
  labels?: Partial<ReceiptLabels>; // Redéfinir n'importe quel libellé

  // ── Sortie ────────────────────────────────────────────────────────────
  footerNote?: string;
  filename?: string | ((data: ReceiptTransactionData) => string);
  autoDownload?: boolean;          // Défaut: true

  // ── Callbacks ─────────────────────────────────────────────────────────
  onGenerated?: (blob: Blob, dataUrl: string) => void;

  // ── Email ──────────────────────────────────────────────────────��──────
  email?: ReceiptEmailConfig;
}

interface ReceiptField {
  label: string;
  value: string | number | ((data: ReceiptTransactionData) => string | number);
}

interface ReceiptLabels {
  receiptTitle: string;         // Défaut: "REÇU DE PAIEMENT"
  invoiceNumberLabel: string;   // Défaut: "N° Facture"
  transactionIdLabel: string;   // Défaut: "ID Transaction"
  amountLabel: string;          // Défaut: "Montant"
  dateLabel: string;            // Défaut: "Date"
  statusLabel: string;          // Défaut: "Statut"
  fromLabel: string;            // Défaut: "DE"
  toLabel: string;              // Défaut: "À"
  serviceLabel: string;         // Défaut: "Service"
  descriptionLabel: string;     // Défaut: "Description"
  totalLabel: string;           // Défaut: "TOTAL"
  thankYouNote: string;         // Défaut: "Merci pour votre paiement."
}

interface ReceiptEmailConfig {
  sendFn?: (params: ReceiptEmailParams) => Promise<void>; // Fonction personnalisée
  sendUrl?: string;                                       // OU endpoint HTTP (POST)
  sendHeaders?: Record<string, string>;
  subject?: string | ((data: ReceiptTransactionData) => string);
  bodyHtml?: string | ((data: ReceiptTransactionData) => string);
  bodyText?: string | ((data: ReceiptTransactionData) => string);
}

interface ReceiptEmailParams {
  to: string;
  subject: string;
  pdfBase64: string;
  pdfBlob: Blob;
  filename: string;
  transactionData: ReceiptTransactionData;
}

interface GenerateReceiptResult {
  blob: Blob;
  dataUrl: string;        // "data:application/pdf;base64,..."
  filename: string;       // Nom du fichier sans extension
}
```

#### Valeur par défaut des libellés

| Libellé | Valeur par défaut |
|---|---|
| `receiptTitle` | `"REÇU DE PAIEMENT"` |
| `invoiceNumberLabel` | `"N° Facture"` |
| `transactionIdLabel` | `"ID Transaction"` |
| `dateLabel` | `"Date"` |
| `statusLabel` | `"Statut"` |
| `fromLabel` | `"DE"` |
| `toLabel` | `"À"` |
| `serviceLabel` | `"Service"` |
| `totalLabel` | `"TOTAL"` |
| `thankYouNote` | `"Merci pour votre paiement."` |

### Analytics

```tsx
type BeninPaymentAnalyticsEventName =
  | "sdk_load_started"
  | "sdk_load_succeeded"
  | "sdk_load_failed"
  | "payment_validation_failed"
  | "payment_pre_validation_started"
  | "payment_pre_validation_succeeded"
  | "payment_pre_validation_cancelled"
  | "payment_pre_validation_failed"
  | "payment_open_attempted"
  | "payment_opened"
  | "payment_completed"
  | "payment_failed"
  | "payment_closed"
  | "payment_verification_started"
  | "payment_verification_succeeded"
  | "payment_verification_failed";
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

### Contrôler la langue et le texte des messages

Les codes d'erreur ci-dessus sont fixes, mais **le texte n'est jamais imposé** : vous avez un contrôle total, à deux niveaux.

**1. `messages` — reformule les messages de validation, par code**

```tsx
// Globalement, pour tous les hooks
<BeninPaymentProvider
  messages={{
    MISSING_PUBLIC_KEY: "API key is missing.",
    INVALID_AMOUNT: "Amount must be greater than 0.",
  }}
>

// Ou juste pour un hook
useFedaPay(config, {
  messages: { INVALID_AMOUNT: "Le montant est incorrect." }, // prime sur le provider
});
```

**2. `resolveErrorMessage` — reformule les erreurs techniques imprévues** (échec de chargement du SDK, erreur réseau lors de la vérification backend...). Retournez `undefined` pour laisser passer au résolveur suivant (local → global → traduction française par défaut) :

```tsx
<BeninPaymentProvider
  resolveErrorMessage={(error) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (/network|offline/i.test(msg)) return "No internet connection.";
    return undefined; // les autres cas gardent la traduction par défaut
  }}
>
```

**3. `parseError` / `createParsedError` — contrôle total quand vous les appelez vous-même**, avec vos propres patterns au lieu des traductions françaises intégrées :

```tsx
import { parseError, DEFAULT_ERROR_PATTERNS } from "react-benin-payments";

// Remplacement complet
parseError(err, {
  patterns: [
    { pattern: /closed|dismissed|cancel/i, message: "Payment cancelled." },
    { pattern: /network|offline/i, message: "No internet connection." },
  ],
  fallbackMessage: "Something went wrong.",
});

// Ou extension : vos règles d'abord, puis les traductions par défaut
parseError(err, { patterns: [...myPatterns, ...DEFAULT_ERROR_PATTERNS] });
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

### Le reçu PDF peut-il être généré côté serveur ?

`usePaymentReceipt` est un hook React pensé pour le client, mais la fonction utilitaire sous-jacente `generateReceiptPdf` s'utilise directement, y compris côté serveur — passez `autoDownload: false` pour éviter tout appel à des API navigateur :

```typescript
import { generateReceiptPdf } from "react-benin-payments";

const { blob, dataUrl, filename } = await generateReceiptPdf(
  { transactionId: "TXN-123", amount: 5000 },
  { appName: "MonShop", autoDownload: false }
);
```

Le générateur par défaut (jsPDF) fonctionne ainsi en Node. Pour un rendu plus riche (mise en page HTML/CSS via `@react-pdf/renderer`, Puppeteer, un template maison...), fournissez `renderPdf` — voir [Remplacer le PDF par défaut](#remplacer-le-pdf-par-défaut-renderpdf).

### Le logo du reçu ne s'affiche pas

Vérifiez que :
1. L'URL est publiquement accessible (pas de CORS bloquant)
2. Le fichier est un PNG ou JPEG valide
3. Si vous utilisez une base64, elle doit commencer par `data:image/png;base64,` ou `data:image/jpeg;base64,`

Alternativement, passez directement une image base64 pour éviter les requêtes réseau :

```tsx
import logoBase64 from "./logo.png?base64"; // Vite
usePaymentReceipt({ logo: `data:image/png;base64,${logoBase64}` });
```

### L'envoi d'email échoue silencieusement

Vérifiez l'état `error` retourné par le hook :

```tsx
const { sendByEmail, error } = usePaymentReceipt({ email: { ... } });

if (error) console.error("Erreur envoi reçu :", error.message);
```

En mode `sendUrl`, l'endpoint doit retourner un statut HTTP `2xx` ; tout autre statut lève une erreur.

---

## Support

- **GitHub Issues** : [Signaler un bug](https://github.com/stvekoulo/react-benin-payments/issues)
- **Documentation FedaPay** : [docs.fedapay.com](https://docs.fedapay.com)
- **Documentation KKiaPay** : [docs.kkiapay.me](https://docs.kkiapay.me)

---

Made with care in Benin by **Steven KOULO**
