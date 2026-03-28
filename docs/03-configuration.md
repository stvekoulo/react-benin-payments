# Configuration initiale

## Étape 1 : Créer le Provider

Le `BeninPaymentProvider` doit envelopper votre application. Il permet de configurer vos clés API une seule fois.

### Pour Next.js (App Router)

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

### Pour React (Vite, CRA)

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

## Étape 2 : Variables d'environnement

Créez un fichier `.env.local` :

```env
# FedaPay
NEXT_PUBLIC_FEDAPAY_KEY=pk_sandbox_xxxxxxxxxxxxxx

# KKiaPay
NEXT_PUBLIC_KKIAPAY_KEY=xxxxxxxxxxxxxxxxxxxxxx
```

**Important :** Ne commitez jamais vos clés API. Ajoutez `.env.local` à votre `.gitignore`.
