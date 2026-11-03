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


## Fournée 3 — sécurité & robustesse (E28)

### 13. ESLint + Prettier

- **Commit** : `fac0dbe` — `chore(lint): ajoute ESLint (flat config) et Prettier`
- **Fichiers** : `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `package.json`, `package-lock.json`
- **Problème** : aucune configuration de qualité / formatage de code (consigne imposée).
- **Correction** : ESLint v10 flat config + eslint-config-prettier, Prettier, scripts `lint` / `format` / `format:check` (0 erreur, 9 warnings `no-unused-vars`).
- **Vérification** : `npm run lint` OK.

### 14. Validation des entrées avec Joi

- **Commit** : `a236cb6` — `feat(validation): valide les entrées utilisateur avec Joi`
- **Fichiers** : `backend/middlewares/validate.js`, `backend/validation/schemas.js`, `backend/routes/{authRoutes,orderRoutes,productRoutes}.js`, `backend/package.json`
- **Problème** : aucune validation des données entrantes (insertion de données non conformes possible).
- **Correction** : middleware `validate(schema)` (400 + détails) et schémas Joi (register, login, createOrder, updateStock), appliqués sur `/auth/*`, `POST /orders`, `PUT /products/:id/stock`.
- **Vérification** : `node --check` OK ; lint OK.

### 15. JWT en cookie HTTPOnly

- **Commit** : `6274d44` — `feat(auth): stocke le JWT dans un cookie HTTPOnly (fini localStorage)`
- **Fichiers** : `backend/{server.js,controllers/authController.js,middlewares/authMiddleware.js,routes/authRoutes.js}` + front (`services/*`, `pages/Login.js`, `pages/Register.js`, `components/{ProtectedRoute,AdminRoute,Navbar}.js`)
- **Problème** : token JWT stocké en `localStorage` (exposé au XSS) ; URLs d'API codées en dur dans Login/Register.
- **Correction** : cookie HTTPOnly (secure en prod), middleware lisant le cookie, route `POST /auth/logout`, CORS `credentials: true`, front en `withCredentials` sans token en localStorage ; URLs via le service partagé.
- **Vérification** : syntaxe backend OK ; JSX validé (esbuild).

### 16. Journalisation avec Winston

- **Commit** : `9255a91` — `feat(logging): journalisation centralisee avec Winston`
- **Fichiers** : `backend/config/logger.js`, `backend/{server.js,config/db.js,seeder.js,controllers/*}`, `.gitignore`
- **Problème** : logs via `console.*` uniquement (consigne Winston non satisfaite).
- **Correction** : logger Winston (console + fichiers `error.log` / `combined.log`, niveau `LOG_LEVEL`) ; `console.*` remplacés dans le backend ; `logs/` ignoré par git.
- **Vérification** : `node --check` OK ; lint OK.

### 17. Messages temporaires avec connect-flash

- **Commit** : `ec5c4dc` — `feat(flash): messages temporaires via connect-flash`
- **Fichiers** : `backend/server.js`, `backend/routes/messages.js`, `backend/controllers/{authController,orderController}.js`, `.env.example`, `docker-compose*.yml`, front `services/api.js` + `pages/Login.js`
- **Problème** : messages d'événement non gérés du backend vers le client (consigne connect-flash).
- **Correction** : express-session + connect-flash, flash sur login/register/logout/commande, endpoint `GET /api/messages` (renvoie puis vide), affichage du message après connexion ; `SESSION_SECRET` ajouté.
- **Vérification** : syntaxe + JSX OK ; `docker compose config` OK.

### 18. Mise à jour des dépendances

- **Commit** : `39ce46f` — `chore(deps): met a jour les dependances (npm audit)`
- **Fichiers** : `package-lock.json` (backend, gateway, notifications, stock-management, frontend), `microservices/notifications/package.json`
- **Problème** : vulnérabilités de dépendances (dont `nodemailer` en high).
- **Correction** : `npm audit fix` sur les services + frontend ; `nodemailer` `^6.9.16` → `10.3.1`.
- **Vérification** : services déployés = 0 vulnérabilité prod ; reliquat frontend (react-scripts, build-time) documenté.


## Fournée 4 — finalisation (E22, E24, E25, E26, E27, E29)

### 19. Suppression du code mort

- **Commit** : `7977b62` — `refactor: supprime le code mort (doublons admin, microservice vide, fichiers orphelins)`
- **Fichiers** : `backend/routes/adminRoutes.js`, `backend/controllers/adminController.js`, `gateway/routes/notif.js`, `gateway/routes/auth.js`, `microservices/auth-gateway/`, `frontend/src/components/ProductList.js` (supprimés)
- **Problème** : code mort et doublons — `adminRoutes`/`adminController` jamais montés (l'admin passe par `/api/orders`), `notif.js` vide, `auth-gateway` vide, `components/ProductList.js` orphelin (copie de ProtectedRoute).
- **Correction** : suppression. L'interface d'administration reste fonctionnelle (via `Admin.js` + `adminApi` + `orderRoutes`/`productRoutes`).
- **Vérification** : plus aucune référence (grep) ; lint 0 erreur.

### 20. Gestion du stock dans le microservice dédié

- **Commit** : `946c5ea` — `feat(stock): gere le stock en base dans le microservice dedie`
- **Fichiers** : `microservices/stock-management/index.js` + `package.json`, `backend/controllers/orderController.js`, `docker-compose*.yml`
- **Problème** : la mise à jour du stock à la commande était commentée ; le microservice ne faisait que logguer.
- **Correction** : `stock-management` se connecte à MongoDB et décrémente le stock (`POST /update-stock`, `GET /stock/:id`) ; `createOrder` appelle le microservice via le gateway ; `MONGO_URI` ajouté au compose.
- **Vérification** : `node --check` OK ; `docker compose config` OK.

### 21. Pipeline CI/CD GitHub Actions + tests

- **Commit** : `173bf95` — `ci: pipeline GitHub Actions + tests`
- **Fichiers** : `.github/workflows/ci.yml`, `backend/validation/schemas.test.js`, `frontend/src/context/CartContext.test.js`, `frontend/src/App.test.js` (supprimé)
- **Problème** : aucun CI/CD ni test (E24).
- **Correction** : workflow (lint, tests backend/frontend, build des images, déploiement pré-prod sur `main` et prod sur tag `v*`) ; tests Joi (node:test) et cartReducer (jest).
- **Vérification** : tests backend 6/6 en local ; YAML valide. (Déploiement à activer une fois les secrets SSH posés par l'admin serveur.)

### 22. Piste d'audit applicative

- **Commit** : `c59f667` — `feat(audit): piste d'audit applicative (E25)`
- **Fichiers** : `backend/config/audit.js`, `backend/controllers/{auth,product,order}Controller.js`
- **Problème** : aucun outil d'audit (E25).
- **Correction** : logger d'audit dédié (`logs/audit.log`, JSON) traçant login (succès/échec), logout, inscription, création/suppression/validation/statut de commande, mise à jour de stock.
- **Vérification** : `node --check` OK ; lint 0 erreur.

### 23. Supervision et alertes

- **Commit** : `5079160` — `feat(monitoring): supervision et alertes (E26)`
- **Fichiers** : `backend/config/metrics.js`, `backend/server.js`, `monitoring/…`, `docker-compose.monitoring.yml`, `docker-compose.yml`, `.env.example`
- **Problème** : aucune supervision ni alerte (E26).
- **Correction** : instrumentation `prom-client` (`/metrics`) ; stack Prometheus + Grafana + Alertmanager + node-exporter + cAdvisor + blackbox ; règles d'alerte (InstanceDown, sonde HTTP, CPU/RAM/disque) ; alertes par email ; interfaces bindées en local (accès VPN/tunnel).
- **Vérification** : `docker compose config` OK ; lint OK. (Stack non démarrée ici.)

### 24. Durcissement de l'hôte

- **Commit** : `865e981` — `chore(security): script de durcissement de l'hote (E22)`
- **Fichiers** : `scripts/harden-host.sh`
- **Problème** : hôte non durci (E22).
- **Correction** : script (ufw refus par défaut + 22/443, SSH par clé, fail2ban, auditd, MAJ auto) à exécuter en root sur le serveur.
- **Vérification** : `bash -n` OK. (Non exécuté ici ; hypothèse APT documentée.)

### 25. Documentation d'API générée

- **Commit** : `8931a1f` — `docs(api): generation automatique de la doc d'API depuis le code (E29)`
- **Fichiers** : `scripts/generate-docs.js`, `doc/API.md`, `package.json`
- **Problème** : documentation non générée depuis le code (E29).
- **Correction** : générateur extrayant les routes Express → `doc/API.md` ; script npm `docs`.
- **Vérification** : génération OK (10 routes).

### 26. Document de rendu

- **Commit** : `44527a5` — `docs(rendu): document de rendu auto-genere (hors RESSOURCES)`
- **Fichiers** : `RENDU/DOCUMENT-RENDU.md`, `scripts/generate-rendu.js`, `package.json`
- **Problème** : aucun document de rendu.
- **Correction** : `RENDU/DOCUMENT-RENDU.md` (infra, séquences, captures, accès) dont la section « Séquences » est générée depuis l'historique git (marqueurs AUTO) ; script npm `rendu`. Distinct de `RESSOURCES/`.
- **Vérification** : génération OK (33 commits).

### 27. Création du répertoire de logs dans l'image backend

- **Commit** : `88c1593` — `fix(backend): cree le dossier /app/logs avec les droits USER node`
- **Fichier** : `backend/Dockerfile`
- **Problème** : le logger Winston écrit dans `/app/logs`, mais l'image backend tournait en `USER node` avec `/app` appartenant à root → échec de création/écriture du répertoire de logs au démarrage en conteneur.
- **Correction** : `RUN mkdir -p /app/logs && chown node:node /app/logs` avant `USER node`.
- **Vérification** : Dockerfile relu ; build/runtime à confirmer côté serveur (non testé ici).

### 28. Loggers structurés pour le gateway et les microservices

- **Commit** : `6cdab74` — `fix(logging): logger structure pour les microservices et le gateway`
- **Fichiers** : `gateway/logger.js`, `gateway/server.js`, `microservices/notifications/{logger.js,index.js}`, `microservices/stock-management/{logger.js,index.js}`
- **Problème** : le gateway et les microservices journalisaient encore via `console.*`, en incohérence avec la journalisation structurée du backend.
- **Correction** : logger JSON structuré (sans dépendance externe) par service, substitué à `console.*`.
- **Vérification** : `node --check` OK ; aucun `console.*` restant hors `logger.js` ; lint OK.

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
