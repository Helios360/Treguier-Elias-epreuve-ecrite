# Corrections

> Convention : **1 correction = 1 commit = 1 partie**.
>
> Baseline (non comptée comme correction) : `6011025` — import initial du projet
> + `.gitignore` racine + suppression du sous-dépôt git imbriqué `frontend/.git`.

---

## Fournée 1 — code & hygiène

### 1. Suppression de la journalisation des secrets et tokens

- **Commit** : `971e4af` — `fix(security): ne plus journaliser les secrets et tokens`
- **Fichiers** : `backend/controllers/authController.js`, `backend/config/db.js`,
  `backend/middlewares/authMiddleware.js`, `microservices/notifications/index.js`
- **Problème** : des données sensibles étaient écrites en clair dans les logs —
  mot de passe utilisateur, token JWT, URI MongoDB (identifiants) et mot de passe
  d'application email.
- **Correction** : retrait de tous les logs exposant des secrets ; remplacés par des
  messages non sensibles (ex. « Tentative de connexion pour: <username> »).
- **Vérification** : `node --check` OK ; revue manuelle, plus aucune valeur sensible journalisée.

### 2. Restriction de CORS aux origines autorisées

- **Commit** : `9c1515d` — `fix(security): restreint CORS aux origines autorisées`
- **Fichier** : `backend/server.js`
- **Problème** : `app.use(cors())` acceptait toutes les origines (CORS `*`).
- **Correction** : liste blanche d'origines configurable via `CORS_ORIGIN`
  (séparées par des virgules) ; par défaut `http://localhost:3000`.
- **Vérification** : `node --check` OK ; le comportement par défaut reste inchangé en local.

### 3. Implémentation de `deleteOrder` et protection de la route DELETE

- **Commit** : `4187694` — `fix(order): implémente deleteOrder et protège la route DELETE`
- **Fichiers** : `backend/controllers/orderController.js`, `backend/routes/orderRoutes.js`
- **Problème** : `deleteOrder` ne supprimait rien et ne renvoyait aucune réponse
  (requête suspendue) ; la route `DELETE /api/orders/:id` n'exigeait pas le rôle admin.
- **Correction** : suppression réelle via `findByIdAndDelete` avec réponses 404/200/500 ;
  ajout du middleware `isAdmin` conformément au commentaire d'origine.
- **Vérification** : `node --check` OK.

### 4. Implémentation de `validateOrder` et correction du statut hors enum

- **Commit** : `6f0fe59` — `fix(order): implémente validateOrder et corrige le statut hors enum`
- **Fichiers** : `backend/controllers/orderController.js`, `backend/controllers/adminController.js`
- **Problème** : `validateOrder` (chemin réellement routé) ne persistait aucun statut et
  lisait `req.body.orderId` alors que la route fournit `:id` ; `adminController` écrivait
  le statut `'Validée'`, absent de l'enum du modèle `Order` → erreur de validation Mongoose.
- **Correction** : `validateOrder` persiste `'En cours de traitement'` (valeur de l'enum) en
  lisant `req.params.id` ; `adminController.validateOrder` aligné sur la même valeur.
- **Vérification** : `node --check` OK ; valeur de statut conforme à l'enum `Order`.

### 5. Retrait des logs sensibles front + URL d'API configurable

- **Commit** : `a1e73c4` — `fix(front): retire les logs sensibles et rend l'URL d'API configurable`
- **Fichiers** : `frontend/src/services/api.js`, `frontend/src/services/adminApi.js`
- **Problème** : le token JWT et les données de commande étaient journalisés côté client ;
  l'URL de l'API était codée en dur (`http://localhost:5000/api`).
- **Correction** : suppression des `console.log` sensibles ; URL d'API via
  `process.env.REACT_APP_API_BASE_URL` (défaut localhost inchangé).
- **Vérification** : parsing ESM OK ; comportement local inchangé sans la variable d'env.

---

## Fournée 2 — conteneurisation & déploiement

### 6. URLs/ports de services configurables

- **Commit** : `e4215b1` — `refactor(config): rend les URLs/ports de services configurables`
- **Fichiers** : `backend/controllers/orderController.js`, `backend/controllers/adminController.js`,
  `microservices/stock-management/index.js`
- **Problème** : URLs de services codées en dur (`http://localhost:8000`, `http://localhost:3001`),
  port du stock codé en dur — inutilisables en conteneurs.
- **Correction** : URL du gateway via `GATEWAY_URL`, destinataire via `NOTIFY_RECIPIENT`,
  port du stock via `STOCK_PORT` (+ `dotenv`).
- **Vérification** : `node --check` OK.

### 7. Dockerfiles des services Node

- **Commit** : `cdd3828` — `build(docker): ajoute les Dockerfiles des services Node`
- **Fichiers** : `backend/`, `gateway/`, `microservices/notifications/`,
  `microservices/stock-management/` (`Dockerfile`, `.dockerignore`, `package.json`)
- **Problème** : aucun Dockerfile n'existait ; `docker compose build` était impossible.
- **Correction** : images `node:20-alpine` (npm ci --omit=dev, `USER node`), `.dockerignore`,
  scripts `start` prod (node) et `dev` (nodemon).
- **Vérification** : non buildée dans cet environnement (socket Docker inaccessible au shell) —
  à valider par `docker compose build`.

### 8. Conteneurisation du frontend

- **Commit** : `04c843a` — `build(docker): conteneurise le frontend (React build + Nginx)`
- **Fichiers** : `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`
- **Problème** : le frontend n'était pas empaquetable (pas de build statique ni de serveur).
- **Correction** : Dockerfile multi-stage (build react-scripts → nginx:alpine) ; `nginx.conf`
  avec fallback SPA, proxy `/api` → `backend:5000` (même origine, pas de CORS) et cache des assets ;
  `REACT_APP_API_BASE_URL` injecté au build (défaut `/api`).
- **Vérification** : `nginx.conf` valide ; build image non exécuté ici (socket Docker).

### 9. Stack de production complète

- **Commit** : `3caadfe` — `build(compose): stack de production complète (Traefik + app + Mongo)`
- **Fichier** : `docker-compose.yml`
- **Problème** : compose incomplet (gateway et stock-management absents, pas de volume Mongo,
  pas de réseau, pas de reverse-proxy).
- **Correction** : ajout de Traefik (TLS Let's Encrypt via DNS-01 Infomaniak, routage par Host),
  des services gateway/stock-management, volume Mongo persistant, Mongo non exposé, réseaux
  `proxy`/`app`, healthchecks, `restart: unless-stopped`.
- **Vérification** : `docker compose config` OK (syntaxe/interpolation).

### 10. Environnements pré-prod et dev

- **Commit** : `6775adf` — `build(compose): environnements preprod et dev + modele de variables`
- **Fichiers** : `docker-compose.preprod.yml`, `docker-compose.dev.yml`, `.env.example`, `docker-compose.yml`
- **Problème** : un seul environnement (inexploitable) ; aucune séparation dev/pré-prod/prod.
- **Correction** : stack pré-prod isolée (`preprod.symnodes.com`, réseau proxy partagé),
  stack dev locale (hot-reload `node --watch` / react-scripts, ports exposés), `.env.example`
  documentant toutes les variables, réseau proxy nommé pour le partage.
- **Vérification** : `docker compose config` OK sur les 3 fichiers.

---

## 11. Remplacement de Traefik par Caddy (reverse-proxy)

- **Commit** : `804331a` — `build(compose): remplace Traefik par Caddy (TLS auto Let's Encrypt)`
- **Fichiers** : `docker-compose.yml`, `docker-compose.preprod.yml`, `Caddyfile` (créé), `.env.example`, `README.md`, `RESSOURCES/RAPPORT.md`
- **Problème** : Traefik ne pouvait pas binder les ports 80/443 (nginx les occupait), et l'API Docker était trop ancienne pour le client Go embarqué (v1.24 vs min 1.40). Le certificat mkcert par défaut empêchait l'affichage du site.
- **Correction** : suppression de Traefik et du stack nginx/certbot/nginx-ui ; ajout de **Caddy** comme reverse-proxy (TLS auto Let's Encrypt via HTTP-01). Le frontend est accessible via l'alias réseau `front-prod`. La stack préprod partage le même Caddy via l'alias `front-preprod`.
- **Vérification** : `symnodes.com`, `www.symnodes.com` et `preprod.symnodes.com` répondent en 200 avec certificat Let's Encrypt valide.

### 12. Correction du crash du microservice stock-management

- **Commit** : `9c87114` — `fix(stock): retire le require dotenv absent des dependances`
- **Fichier** : `microservices/stock-management/index.js`
- **Problème** : `require('dotenv').config()` alors que `dotenv` n'est pas dans les dépendances (`npm ci --omit=dev` ne l'installe pas) → `MODULE_NOT_FOUND` au démarrage, conteneur en boucle de redémarrage.
- **Correction** : suppression du `require` inutile (les variables viennent de `environment` dans le compose).
- **Vérification** : conteneur `stock-management` stable (prod et préprod).

---

## Modèle de partie

```
## N. Titre de la correction

- **Commit** : `<sha>` — `<message>`
- **Fichier(s)** : `chemin/du/fichier`
- **Problème** : ...
- **Correction** : ...
- **Vérification** : ...
```
