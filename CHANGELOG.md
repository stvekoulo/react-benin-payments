# Changelog

Tous les changements notables de ce projet sont documentés ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [2.0.2] - 2026-07-03

### Ajouté

- `react-benin-payments/core` — moteur de paiement framework-agnostic (`createPaymentEngine`, `usePaymentEngine`, `PaymentDriver`) exposé publiquement pour brancher un provider non fourni par le package (CinetPay, PayDunya, Stripe, passerelle interne...), utilisable dans n'importe quel type de projet (e-commerce, SaaS, dons...)
- `renderPdf` dans `usePaymentReceipt` / `generateReceiptPdf` — remplace entièrement le générateur PDF par défaut par le vôtre (autre librairie, génération serveur, template maison)
- `messages` (global via `BeninPaymentProvider`, ou par hook) — reformule les messages de validation (`MISSING_PUBLIC_KEY`, `INVALID_AMOUNT`...) par code d'erreur
- `resolveErrorMessage` (global ou par hook) — reformule les erreurs techniques imprévues (échec de chargement du SDK, erreur réseau...), avec repli en cascade (local → global → traduction par défaut)
- `parseError` / `createParsedError` acceptent désormais `{ patterns, fallbackMessage }` pour remplacer ou étendre les traductions françaises intégrées ; `DEFAULT_ERROR_PATTERNS` est exporté pour permettre l'extension
- CLI (`npx react-benin-payments init`) : nouvelle question sur l'outil de build (Next.js / Vite / Create React App / aucun) pour générer le bon préfixe de variables d'environnement et le bon accesseur (`process.env` vs `import.meta.env`)
- `environmentWarnings` (global via `BeninPaymentProvider`, ou par hook) — reformule les avertissements console dev (clé live en sandbox, etc.), jusque-là non traduisibles
- `validatePublicKeyAndAmount`, exporté depuis `react-benin-payments/core` — la validation clé/montant partagée par les deux drivers intégrés, réutilisable pour un driver personnalisé

### Modifié

- `useFedaPay` et `useKkiaPay` reposent désormais sur un moteur de paiement partagé (`src/core` + `src/providers`) au lieu de dupliquer la même logique — aucun changement d'API publique
- Nouveau design par défaut des reçus PDF : minimaliste (fine bande de couleur, séparateurs discrets, hiérarchie typographique), à la place de l'ancien design à blocs colorés
- `jspdf` devient une *peer dependency* optionnelle (chargée à la demande) au lieu d'une dépendance obligatoire — les projets qui n'utilisent pas `usePaymentReceipt` ne l'installent plus
- L'avertissement clé live/sandbox de FedaPay est désormais émis à l'ouverture du paiement plutôt qu'au montage du composant, pour s'aligner sur le comportement de KKiaPay
- CLI : ne génère plus de route API Next.js (`generateVerifyRoute` supprimée) — génère uniquement `.env.example` et le composant provider, avec un pointeur vers la doc de vérification backend ; le fichier généré est renommé `.env.example` (au lieu de `.env.local.example`)
- KKiaPay : le driver relie désormais ses gestionnaires d'événements à l'appel `open()` en cours plutôt qu'à un abonnement permanent partagé — `PaymentDriver.attachListeners` est retiré de l'interface, devenue inutile
- Le champ "Fournisseur" des reçus PDF et `ReceiptTransactionData.provider` acceptent maintenant l'identifiant de n'importe quel driver personnalisé, pas seulement `"fedapay"`/`"kkiapay"`
- La fusion `messages`/`resolveErrorMessage`/`environmentWarnings` (global ↔ par hook) est centralisée dans un helper interne partagé par les trois hooks au lieu d'être dupliquée

### Corrigé

- Montant total du reçu PDF mal affiché (ex. `15/000 F/CFA` au lieu de `15 000 FCFA`) à cause d'espaces Unicode insécables produits par `Intl.NumberFormat` que les polices intégrées de jsPDF ne supportent pas
- Un message d'erreur renvoyé par votre propre backend de vérification (`verifyUrl`) pouvait être silencieusement remplacé par une traduction générique s'il contenait par coïncidence un mot-clé technique (ex. un code HTTP) — il est maintenant toujours transmis tel quel
- KKiaPay : un événement de paiement réel (succès/échec/fermeture) pouvait être relayé à toutes les instances `useKkiaPay()` montées sur la page au lieu de la seule ayant initié le paiement
- CLI : le préfixe d'outil de build retombait silencieusement sur Next.js si l'utilisateur tapait le libellé affiché ("Create React App") plutôt que la clé courte ("cra")

## [1.1.0] - 2026-04-25

### Ajouté

- `usePaymentReceipt` — génération de reçus PDF personnalisables (logo, couleurs, numérotation, champs additionnels, pied de page) et envoi automatique par email (`sendFn` ou `sendUrl`)

### Corrigé

- Faux positif du loader de script quand le SDK est déjà présent dans le DOM mais pas encore chargé
- `usePaymentStatus` n'arrêtait pas toujours proprement le polling après `maxAttempts`, notamment en cas d'erreurs réseau répétées
- `usePaymentHistory` ne rechargeait pas l'historique quand `storage` ou `storageKey` changeaient
- `useBeninPay` écrasait silencieusement certains callbacks FedaPay existants
- La configuration de vérification KKiaPay n'était pas transmise par le hook universel `useBeninPay`
- Incohérences entre la documentation et les types FedaPay

## [1.0.0] - 2026-04-22

### Ajouté

- `usePaymentHistory` — historique des paiements en mémoire, session ou localStorage
- `<PaymentStatusBadge />` — composant visuel de statut de paiement
- `onBeforePayment` — pré-validation asynchrone avant l'ouverture du widget de paiement
- `useBeninPay.lastTransaction` — dernière transaction réussie exposée directement
- Événements analytics standardisés compatibles PostHog, Mixpanel, etc.
- Imports séparés `react-benin-payments/fedapay` et `react-benin-payments/kkiapay` pour un meilleur tree-shaking
- Marqueurs `"use client"` explicites pour React 19 / React Server Components
- Support WebSocket pour `usePaymentStatus`, en plus du polling

### Corrigé

- Double chargement des SDKs FedaPay/KKiaPay
- Mutation directe de l'objet de configuration dans `useBeninPay`
- Boucle infinie de (dés)abonnement des listeners KKiaPay dans `useKkiaPay`

## [0.1.4] - 2026-03-25

### Modifié

- Ajustements mineurs suite à l'introduction des tests

## [0.1.3] - 2026-03-25

### Ajouté

- Suite de tests (Vitest) et premiers hooks de paiement

## [0.1.2] - 2026-01-11

### Ajouté

- Documentation complète (`DOCUMENTATION.md`)

## [0.1.1] - 2026-01-10

### Ajouté

- Exemple d'application Next.js (`/example`)

## [0.1.0] - 2026-01-09

### Ajouté

- Version initiale : composants et hooks de paiement FedaPay/KKiaPay
