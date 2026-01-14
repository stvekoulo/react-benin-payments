# Introduction

## Qu'est-ce que react-benin-payments ?

`react-benin-payments` est une librairie React qui simplifie l'intégration des solutions de paiement béninoises FedaPay et KKiaPay. Elle fournit :

- Des **composants prêts à l'emploi** (boutons de paiement)
- Des **hooks React** pour une intégration personnalisée
- Un **système de configuration global** via Context
- Une **vérification backend automatique** des transactions
- Un **mode test** pour le développement

## Providers supportés

| Provider | Mobile Money | Carte bancaire | Site officiel                      |
| -------- | ------------ | -------------- | ---------------------------------- |
| FedaPay  | Oui          | Oui            | [fedapay.com](https://fedapay.com) |
| KKiaPay  | Oui          | Oui            | [kkiapay.me](https://kkiapay.me)   |

## Prérequis

- React 17.0.0 ou supérieur
- Un compte FedaPay et/ou KKiaPay
- Vos clés API publiques (sandbox pour le développement, live pour la production)
