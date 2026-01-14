# Mode Test et Production

## Différences sandbox vs live

| Aspect       | Sandbox (Test)           | Live (Production)     |
| ------------ | ------------------------ | --------------------- |
| Clé API      | `pk_sandbox_...`         | `pk_live_...`         |
| Transactions | Simulées                 | Réelles               |
| Opérateurs   | "momo test", "card test" | MTN, Moov, Visa, etc. |
| Argent réel  | Non                      | Oui                   |

## Configuration pour le développement

```tsx
<BeninPaymentProvider
  fedaPayPublicKey="pk_sandbox_xxxxxx"
  isTestMode={true}
  debug={true}
>
```

## Configuration pour la production

```tsx
<BeninPaymentProvider
  fedaPayPublicKey={process.env.NEXT_PUBLIC_FEDAPAY_LIVE_KEY}
  isTestMode={false}
  debug={false}
>
```

## Détection automatique

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
