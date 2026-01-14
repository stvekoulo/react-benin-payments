# FAQ

## Le widget affiche "momo test" au lieu des vrais opérateurs

C'est normal en mode sandbox. Les opérateurs de test permettent de simuler des paiements sans débiter de réels comptes. Passez en mode live pour voir les vrais opérateurs.

## Comment autoriser mon domaine pour FedaPay ?

1. Connectez-vous à votre tableau de bord FedaPay
2. Allez dans Paramètres > Domaines autorisés
3. Ajoutez votre domaine (ex: `https://monsite.com`)
4. Pour le développement local, ajoutez `http://localhost:3000`

## Le SDK ne charge pas

Vérifiez :

1. Votre connexion internet
2. Que votre domaine est autorisé dans le dashboard FedaPay/KKiaPay
3. Les erreurs dans la console du navigateur
4. Que les scripts ne sont pas bloqués par un adblocker

## Comment tester sans faire de vraies transactions ?

Utilisez le mode sandbox :

```tsx
<BeninPaymentProvider isTestMode={true}>
```

Ou utilisez le mode mock pour les tests automatisés :

```tsx
useFedaPay(config, { mock: true });
```

## Puis-je utiliser les deux providers simultanément ?

Oui ! Configurez les deux clés dans le provider :

```tsx
<BeninPaymentProvider
  fedaPayPublicKey="pk_xxx"
  kkiaPayPublicKey="pk_xxx"
>
```

Puis utilisez le bouton ou hook approprié selon vos besoins.

## Comment gérer les webhooks ?

Les webhooks sont gérés côté serveur, indépendamment de cette librairie. Consultez la documentation de FedaPay et KKiaPay pour configurer vos endpoints webhook.

# Support

- **GitHub Issues** : [Signaler un bug](https://github.com/stvekoulo/react-benin-payments/issues)
- **Documentation FedaPay** : [docs.fedapay.com](https://docs.fedapay.com)
- **Documentation KKiaPay** : [docs.kkiapay.me](https://docs.kkiapay.me)
