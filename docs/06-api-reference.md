# Référence API

## BeninPaymentProvider

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

## useBeninConfig

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

## FedaPayButton

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

## KkiaPayButton

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

## useFedaPay

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

## useKkiaPay

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

## useBeninPay

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
