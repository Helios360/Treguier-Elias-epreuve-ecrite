# Cahier des charges — Épreuve écrite Cloud-Campus

> Source : `CONSIGNE EXAMEN.pdf` (auteur : BALDE · 35 slides Canva, 1440×810).
> Conversion en markdown du support de consignes.
> Certaines slides sont des captures d'écran / schémas qui ne contiennent pas de
> texte exploitable ; c'est signalé au fil du document. Pour ces passages,
> se référer au PDF d'origine.

---

## 1. Contexte

**Situation professionnelle de mise en production et de maintenance applicative.**

La mise en situation professionnelle de maintenance d'une application.

---

## 2. Présentation de l'environnement de l'application

L'environnement fourni comprend une application web existante. Elle se compose
principalement :

- D'un front-end web « ReactJS »
- D'un back-end « NodeJS »
- D'une base de données NoSQL « MongoDB »
- D'un micro-service « NodeJS »
- D'appels API externes

> Cette application comporte des bugs techniques, des failles de sécurité et
> repose sur certains composants obsolètes.

---

## 3. Rappels des sessions (E21 → E29)

### Session 1 — solution d'hébergement & maintenance (durée : trois heures)

La session 1 est subdivisée en plusieurs étapes dont l'objectif est la
préproduction, la mise en production et la supervision de l'application.

- **E21** : Le choix d'une solution d'hébergement de type cloud adaptée à l'application.
- **E22** : La mise en œuvre sécurisée de l'environnement de production.
- **E23** : La réservation d'un nom de domaine, la configuration des DNS
  correspondants, l'installation et la vérification des certificats de sécurité
  pour les environnements de pré-production et de production.
- **E24** : La mise en œuvre d'un système de déploiement automatisé
  (CI/CD — conteneurisation).
- **E25** : La mise en œuvre de la journalisation et d'outils d'audit
  correspondants aux deux environnements.
- **E26** : La mise en œuvre des outils de supervision et la configuration des
  alertes adaptées au contexte de l'application pour les deux environnements
  précédemment créés.

### Session 2 — code robuste, sécurité et documentation (durée : deux heures)

- **E27** : La détection des bugs de l'application et la proposition de mesures correctives.
- **E28** : La détection des failles de sécurité, et la proposition de mesures correctives.
- **E29** : La génération de la documentation à partir du code source et la mise
  à jour du journal des évolutions ou « changelog ».

---

## 4. L'application web

### 4.1 Présentation

Le projet web à mettre en production et à maintenir est un mini site
e-commerce avec les fonctionnalités suivantes :

- Liste des produits.
- Bouton d'ajout au panier.
- Contexte de gestion du panier global avec Context API.
- Fonctionnalités de gestion d'un panier (CRUD produits dans le panier, bouton
  validation de la commande) avec Context API.
- L'écran synthèse commande avant la validation d'une commande, gestion de
  l'état d'une commande (« En cours de traitement », « Expédié », …).
- Gestion des utilisateurs avec les rôles « user », « admin » :
  - **user** : client du site (navigation, commande, …).
  - **admin** : gestion du backend (commande, produit, stock, utilisateurs, …).
- **Microservices** : pour la gestion des notifications (événement mise à jour
  stock et validation commande, …).
- **Gateway** : qui lie l'ensemble de l'application (front & back) aux microservices.

L'application a été développée en utilisant le stack **MERN**.

### 4.2 Structure du projet

Structure des répertoires et fichiers du projet :

| Élément | Rôle |
|---------|------|
| `backend/` | Contient l'API de l'application en liaison avec la base de données. |
| `docker-compose` | Conteneurisation : début de construction de l'orchestration avec Docker Compose. |
| `frontend/` | Le front de l'application en React. |
| `gateway/` | Met en relation le fonctionnement de l'application et des microservices. |
| `microservices/` | Fonctionnalités spécifiques de l'application gérées sous forme de microservices (notifications, stock-management, …). |

> _Slide « structure » : capture d'arborescence illustrant ces répertoires._

### 4.3 Structure — backend

- `config/` : contient la configuration et la connexion à la base de données (`db.js`).
- `controllers/` : l'ensemble des controllers de l'application — admin, auth,
  order, product, … pour le traitement des demandes CRUD.
- `middlewares/` : un seul middleware (`authMiddleware.js`) contenant deux
  fonctions : `authenticateToken` et `isAdmin`.
- `models/` : l'ensemble des modèles de données nécessaires dans l'application
  → `Order`, `Product`, `User`, …
- `routes/` : l'ensemble des routes de l'application → `admin`, `auth`,
  `order`, `product`.
- `seeder` : script de création d'un jeu de données.

### 4.4 Structure — frontend / gateway / microservices

> _Slides « structure - frontend », « structure - gateway » et
> « structure - microservices » : arborescences illustrées (captures d'écran,
> sans texte exploitable)._

---

## 5. Les écrans de l'application

> _Slides illustrées par des captures d'écran._

| Écran | Description |
|-------|-------------|
| Accueil | Page « accueil » de l'application. |
| Panier | Page « panier » de l'application. |
| Connexion | Page « connexion » de l'application. |
| Commande | Page « après connexion » de l'application. |
| Adresse, Paiement, transport | Page « Adresse de livraison et Méthode de paiement » + arborescence du projet. |
| Confirmation de commande | Log de confirmation de commande et d'envoi de notification mail ; notification mail du microservice (nouvelle commande). |
| Connexion admin & administration | Pages « connexion admin et administration ». |
| Détails commande (admin) | Action détails de la commande en admin. |
| Gestion des produits (admin) | Section gestion des produits en admin. |

---

## 6. Microservices

### Notification

Ce service utilise la bibliothèque **NodeMailer** pour envoyer des notifications
mail aux administrateurs et utilisateurs du site e-commerce.

### Stock management

Ce service s'occupe de l'aspect de gestion du stock de l'application
e-commerce : l'objectif est de décentraliser toute la gestion de stock dans ce
service.

---

## 7. Gateway — point d'entrée des microservices

Le gateway personnalise le chemin d'accès aux microservices ; il est ainsi
possible d'utiliser le même domaine pour accéder à l'ensemble des microservices :

- `http://localhost:8000/notify` → service de notification.
- `http://localhost:8000/update-stock` → service de gestion du stock.

---

## 8. Exécution de l'application en local

Actuellement, pour faire fonctionner l'application en local, il faut procéder de
deux manières :

- Exécuter individuellement chaque composant : backend, microservices, gateway,
  et enfin le front ;
- Ou utiliser le script ci-dessous pour lancer l'ensemble des composants en une
  seule commande :

```bash
# Le Backend
node server.js

# Le gateway et les microservices
npm run start:all

# Le Frontend
npm start
```

> _Ce passage correspond à des captures d'écran de terminal dans le PDF._

---

## 9. Évaluation 1 & 2 — objectif

L'objectif de cette évaluation est de vérifier et valider vos compétences en
matière de gestion, de mise en production et de maintenance d'une application
web quelconque. Vous disposez à présent d'une application non robuste (bug,
sécurité, contrôle d'accès, …) mais basique en termes de fonctionnalité et de
structure :

- **Fonctionnalité basique** : site e-commerce (gestion utilisateur avec rôle,
  gestion de panier, gestion de commande avec choix d'un mode de paiement et de
  transporteur).
- **Structure basique** : frontend, backend, gateway avec microservices.

Dans le cadre de votre évaluation (voir document en pièce jointe et slides 3 et
4 : suivre les étapes E21 jusqu'à E29), vous devez :

- Trouver et corriger les bugs de sécurité, faire des propositions
  d'amélioration et les réaliser.
- Rendre le code robuste en effectuant un contrôle des données utilisateurs.
- Vérifier et mettre à jour les bibliothèques dans l'ensemble du projet.
- Créer un environnement de préproduction (conteneurisation — Docker) et de production.
- Faire le choix d'un hébergeur en fonction de critères pertinents de
  performance, de maintenance, de sécurité, …
  - Utilisation de configuration de nom de domaine et de sous-domaine pour les
    composants de l'application (configuration DNS, mise en place et
    vérification de certificats de sécurité pour les deux environnements) afin
    que l'ensemble front, back, microservice, … fonctionnent.
- Mettre en place un CI/CD pour les deux environnements pour automatiser la mise
  en production.
- Mettre en place des outils de journalisation et d'audit pour les deux environnements.
- Mettre en œuvre et utiliser des outils de supervision de service et configurer
  des sondes d'alertes dans le contexte de l'application pour les deux environnements.
- Documenter le code de l'application : génération d'une documentation à partir
  du code source et journalisation des évolutions.

> NB : illustrations et consignes sur les slides 27 à 35.

---

## 10. Mise à disposition et rendu final

Vous aurez à disposition pour cette évaluation :

- Le code source de l'application : backend, frontend, gateway, microservices,
  dump de la base de données.
- Les accès admin du premier utilisateur de la base de données.
- Les détails SMTP pour l'envoi de mail — notification.

Pour l'ensemble des tâches réalisées, veuillez fournir un document contenant :

- Les différentes tâches effectuées sous forme de séquences détaillées.
- Des explications approfondies.
- Des captures d'écran illustratives.

Enfin, merci de transmettre tous les accès et identifiants (serveurs, comptes
d'accès, etc.) afin de permettre la vérification des travaux effectués.

---

## 11. Sécurité et robustesse du code (consignes techniques)

### 11.1 Variables d'environnement (`.env`)

Éviter d'exposer les informations sensibles (clé API, URI MongoDB, …). Stocker
ces données dans un fichier `.env` et les charger avec **dotenv**. Ajouter le
`.env` au `.gitignore`.

### 11.2 Contrôle des données et validation des entrées utilisateur

Éviter d'insérer des données non conformes dans la base de données. Utiliser
**Joi** pour définir des schémas de validation.

### 11.3 Éviter `localStorage` pour stocker des tokens sensibles

- **Mauvaise pratique** : stocker un token JWT dans `localStorage`, car il peut
  être exposé aux attaques XSS.
- **Bonne pratique** : utiliser un cookie **HTTPOnly** sécurisé.

### 11.4 Gestion des erreurs avec `try/catch`

Éviter le crash du serveur à cause d'une erreur non gérée. Entourer les
opérations critiques avec `try/catch` et vérifier côté front les retours serveur.

### 11.5 Afficher des messages côté client

Utiliser des modules comme **connect-flash** pour envoyer des messages
temporaires aux utilisateurs après un événement du backend vers le frontend.

### 11.6 Qualité du code avec ESLint et Prettier

Installer et configurer les outils d'assistance et d'amélioration de la qualité
du code **ESLint** et **Prettier**.

### 11.7 Maintien des bibliothèques à jour et journalisation

Vérifier et mettre à jour les dépendances. Utiliser des packages comme
**Winston** pour la gestion des logs.

### 11.8 Utilisation de Debug pour l'assistance Dev

Utiliser **Debug** pour l'assistance en développement.

---

## 12. Consigne générale

> **ATTENTION — CONSIGNE**
>
> « L'utilisation de l'IA et d'Internet est autorisée, mais l'usage d'outils de
> communication tels que WhatsApp ou Discord est interdit. »

---

_Cloud Campus — Bon courage :-)_
