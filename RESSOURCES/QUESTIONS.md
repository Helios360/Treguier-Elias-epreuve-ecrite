# Questions

> Formulaire d'épreuve — réponses détaillées, vérifiées sur l'installation réelle
> (contrôles effectués le 2026-11-03 : DNS, certificats, HTTP, conteneurs, tests).

E21 – Choisir une solution d’hébergement cloud adaptée à l’application, en produire une analyse argumentée et mettre en œuvre un environnement de qualification (pré-production). *

### Réponse E21

**Analyse et choix de la solution d'hébergement.** L'application (MERN, 6 services conteneurisés)
demande un hôte capable d'exécuter Docker, de publier des ports 80/443 et d'héberger une base de
données. Trois familles ont été comparées :

| Solution | Avantages | Inconvénients pour ce projet |
|----------|-----------|------------------------------|
| PaaS (Heroku/Railway) | zéro administration, CI intégrée | coût récurrent, données hors de contrôle, moins pédagogique, limites de mémoire |
| IaaS (VM OVH/Scaleway) | contrôle total, IP publique dédiée | coût mensuel, tout est à administrer |
| **Homeserver auto-hébergé (solution retenue)** | coût nul, souveraineté totale des données, maîtrise de la pile (Docker, reverse-proxy, supervision), réutilise une infrastructure déjà sécurisée par VPN | exposition publique à sécuriser (TLS, pare-feu, clés SSH) |

**Mise en œuvre** : production et pré-production sur le homeserver (IP publique statique
`176.176.123.209`, sans CGNAT — le port-forwarding est maîtrisé sur la box). L'environnement de
**qualification** est la pré-production : `preprod.symnodes.com`, isolée de la production par un
projet Docker distinct (`-p symnodes-preprod`, fichier `docker-compose.preprod.yml`), partageant
uniquement le reverse-proxy Caddy — jamais la base de données ni les volumes.

**Preuves** : `getent hosts preprod.symnodes.com` → `176.176.123.209` ;
`https://preprod.symnodes.com/` → **200** ; les 6 conteneurs pré-prod sont `Up`
(`docker ps` : `symnodes-preprod-*`, mongo *healthy*).

E22 – Mettre en œuvre de manière sécurisée l’environnement de production et administrer les services associés. *

### Réponse E22

La production (`symnodes.com`, projet Docker `treguier-elias-epreuve-ecrite`) est sécurisée à
plusieurs niveaux :

- **Secrets** : toutes les valeurs sensibles (Mongo, JWT, session, SMTP, comptes admin) sont dans
  un `.env` hors git (`.gitignore`) en mode `600`. Contrôle : `git ls-files | grep '^\.env$'` → 0.
- **Conteneurs non privilégiés** : les images Node s'exécutent en `USER node` (corrections 27 et
  31 : `/app/logs` créé et `COPY --chown=node:node . .`). MongoDB n'expose **aucun port** sur
  l'hôte (réservé au réseau Docker interne).
- **TLS** : reverse-proxy Caddy avec certificats Let's Encrypt automatiques (voir E23).
- **Contrôle d'accès** : administration par SSH à clé uniquement, l'accès réseau d'administration
  reste derrière le VPN WireGuard ; les interfaces de supervision sont protégées par basic-auth
  Caddy (voir E26).
- **Durcissement de l'hôte** : `scripts/harden-host.sh` (pare-feu, SSH par clé, fail2ban, auditd,
  mises à jour automatiques). *Point d'honnêteté* : le script cible Debian/Ubuntu (APT) ; l'hôte
  tournant sous Arch, il doit être adapté (`pacman`) avant exécution — fail2ban/auditd ne sont
  pas encore actifs sur l'hôte.
- **Administration opérationnelle** : `scripts/deploy.sh` (redéploiement idempotent : pull,
  build, seed admin, reload Caddy, vérifications HTTP — jamais de `down`), testé deux fois de
  suite avec succès.

**Preuves** : backend *healthy*, tous les conteneurs prod `Up` depuis des heures ;
le conteneur backend écrit ses logs en tant qu'utilisateur `node` (pas de root) ;
`https://symnodes.com/` → **200**, `https://symnodes.com/api/products` → **200**.

E23 – Réserver un nom de domaine, configurer les serveurs de noms (DNS), déployer les services associés et installer/vérifier les certificats HTTPS pour les deux environnements créés. *

### Réponse E23

- **Domaine** : `symnodes.com` (Infomaniak, NS `ns11.infomaniak.ch` / `ns12.infomaniak.ch`).
- **Zone DNS** : enregistrements **statiques** vers l'IP publique du homeserver — `@ A`
  (apex) et `* A` (wildcard couvrant `www`, `preprod`, `grafana`, `prometheus`,
  `alertmanager`). IPv6 volontairement non publiée (routage entrant non vérifié) ; SPF
  `v=spf1 -all` + DMARC (domaine non émetteur). La zone figure en entier dans
  `RESSOURCES/RAPPORT.md` (corrections 37).
- **Certificats** : obtenus automatiquement par **Caddy** (Let's Encrypt, validation HTTP-01 sur
  le port 80), avec renouvellement automatique et redirection HTTP → HTTPS. Un même certificat
  par site, routage par en-tête Host entre production et pré-production.
- **Vérification des deux environnements** (le 2026-11-03) :

```
symnodes.com / www / preprod / grafana / prometheus / alertmanager → 176.176.123.209
issuer = Let's Encrypt (CN=YE2) sur symnodes.com, preprod.symnodes.com, grafana.symnodes.com
https://symnodes.com/           → 200
https://www.symnodes.com/       → 200
https://preprod.symnodes.com/   → 200
https://grafana.symnodes.com/   → 302 (page de connexion)
https://prometheus.symnodes.com/    → 401 (basic-auth)
https://alertmanager.symnodes.com/  → 401 (basic-auth)
```

E24 – Mettre en œuvre un système de déploiement automatisé (CI/CD) pour les environnements pré-production et production. *

### Réponse E24

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) enchaîne, sur chaque push sur `main` et
chaque PR :

1. **Lint** (ESLint, config flat + Prettier) — 0 erreur sur l'état actuel ;
2. **Tests backend** (`node --test backend/validation/schemas.test.js`) — verts ;
3. **Tests frontend** (jest, cartReducer) — 5/5 ;
4. **Build des 5 images Docker** (backend, gateway, notifications, stock-management, frontend
   avec `REACT_APP_API_BASE_URL=/api`) ;
5. **Déploiement pré-production** (push sur `main`) puis **production** (tag `v*`, environment
   `production`) via `appleboy/ssh-action` : `git pull` + `docker compose up -d --build`.

Le déploiement est conditionné par un **garde-fou secrets** : si `DEPLOY_HOST` est vide, l'étape
de déploiement est sautée proprement au lieu de faire rougir tout le pipeline.

**Côté serveur** : le compte de déploiement `deploy` (groupe `docker`) est en place, avec une clé
SSH dédiée (`ed25519`, commentaire `github-actions`) posée dans son `authorized_keys`, les droits
sur le dépôt (ACL) et le `safe.directory` git configurés. Testé : connexion SSH par cette clé →
`docker ps` fonctionne. La clé privée est destinée au secret `DEPLOY_SSH_KEY`. Le premier
déploiement réel se déclenche au prochain push (`main` → pré-production) ou tag (`v*` →
production).

E25 – Configurer la journalisation des services et les outils d’audit adaptés à l’application. *

### Réponse E25

- **Journalisation applicative** : le backend journalise via **Winston**
  (`backend/config/logger.js`) dans `logs/combined.log` et `logs/error.log` (niveau
  configurable `LOG_LEVEL`). Le gateway et les deux microservices ont leur propre logger
  **structuré JSON** (correction 28). Vérifié dans le conteneur backend : les trois fichiers de
  logs existent et sont écrits par l'utilisateur `node`.
- **Piste d'audit applicative** : `backend/config/audit.js` trace les événements sensibles dans
  `logs/audit.log` au format JSON — connexions (succès/échec), déconnexions, inscriptions,
  création/suppression/validation de commandes, mises à jour de stock. Exemple réel relevé :
  `{"event":"login_success","role":"admin","username":"admin",...}`.
- **Audit système** : `scripts/harden-host.sh` installe et active `auditd` et `fail2ban` sur
  l'hôte (à adapter à Arch avant exécution, cf. E22).

E26 – Mettre en œuvre un système de supervision et configurer des alertes pertinentes pour les deux environnements. *

### Réponse E26

Stack complète dans `docker-compose.monitoring.yml` (projet `symnodes-monitoring`, aucun port
hôte — exposition uniquement via Caddy) :

- **Collecte** : Prometheus scrape le backend (`/metrics`, prom-client), node-exporter (hôte),
  cAdvisor (conteneurs) et **les deux environnements** via blackbox-exporter
  (`https://symnodes.com` et `https://preprod.symnodes.com`). Vérifié : API Prometheus
  `targets` → `success`, cible `backend:5000` active.
- **Règles d'alerte** (`monitoring/prometheus/alert.rules.yml`) : `InstanceDown` (cible muette
  2 min), `HttpProbeFailed` (sonde HTTP en échec), `HighCpuUsage` (>85 %), `HighMemoryUsage`
  (>90 %), `LowDiskSpace` (>90 %) — avec sévérités et fenêtres (`for`).
- **Notification** : Alertmanager (`monitoring/alertmanager/alertmanager.template.yml` substitué
  par `entrypoint.sh` au démarrage, correction 36) route vers un **receiver email** (SMTP
  configuré via `.env`, `send_resolved: true`, regroupement par alerte).
- **Visualisation** : Grafana avec dashboard **provisionné** « symnodes — Vue d'ensemble »
  (`monitoring/grafana/provisioning/dashboards/json/symnodes-overview.json`, uid
  `symnodes-overview`) : 16 panneaux — disponibilité des deux environnements, cibles
  Prometheus, 5xx, latence, débit par route, p95 du backend, RAM du tas Node, ressources hôte
  et par conteneur (correction 39). Vérifié via l'API Grafana : `/api/dashboards/uid/
  symnodes-overview` → **200**.
- **Accès** : `grafana.` / `prometheus.` / `alertmanager.symnodes.com` avec basic-auth Caddy
  (Prometheus et Alertmanager → **401** sans identifiants).

E27 – Détecter et analyser les bugs de l’application, puis proposer des mesures correctives pertinentes. *

### Réponse E27

Chaque anomalie a fait l'objet d'une correction = un commit = une entrée du registre
(`RESSOURCES/CORRECTIONS.md`, 39 entrées). Échantillon représentatif :

- **`deleteOrder` inopérant** : la route DELETE ne supprimait rien et restait suspendue, sans
  protection admin → implémentation réelle + middleware `isAdmin` (correction 3).
- **Statut de commande hors enum** : `validateOrder` lisait `req.body.orderId` au lieu de
  `req.params.id` et écrivait `'Validée'`, absent de l'enum Mongoose → correction 4.
- **Microservice stock en boucle** : `require('dotenv')` absent des dépendances de
  stock-management → `MODULE_NOT_FOUND` au démarrage (correction 12) ; la mise à jour du stock
  était commentée → décentralisée dans le microservice (correction 20).
- **Crashs en conteneur (EACCES)** : `USER node` sans `/app/logs` (correction 27), puis fichiers
  en mode 600 copiés `root` (`COPY --chown`, correction 31) → services en `Restarting` jusque-là.
- **Frontend 502 après redéploiement** : nginx figeait la résolution DNS de `backend:5000` →
  `resolver` Docker + `proxy_pass` par variable (correction 32).
- **Caddy périmé après `git pull`** : bind mount de fichier unique épinglé sur l'ancien inode →
  montages par répertoire (correction 33).
- **Alertmanager en crash-loop** : flag `--config.expand-env` inexistant → template + entrypoint
  (correction 36) ; **Grafana crash-loop** sur fichiers de provisioning en mode 600 →
  correctifs de permissions dans `deploy.sh` (correction 39).

Détection par : revue du code, logs des conteneurs, sondes HTTP, supervision Prometheus
(voir E26), et validation systématique `node --check` + lint + tests à chaque correction.

E28 – Identifier les failles de sécurité et proposer des solutions pour y remédier. *

### Réponse E28

Failles identifiées et corrigées (registre complet dans `RESSOURCES/CORRECTIONS.md`) :

- **Secrets dans les logs** (mot de passe, JWT, URI MongoDB, mot de passe SMTP) → retirés
  (correctifs 1 et 5).
- **CORS `*`** → liste blanche configurable `CORS_ORIGIN` (correctif 2).
- **JWT en `localStorage`** (exposé au XSS) → cookie **HTTPOnly** (`secure` en prod), logout
  côté serveur, `withCredentials` (correctif 15). Contrôle actuel : `grep localStorage
  frontend/src` → seuls `username`/`role` y sont conservés (pas de token).
- **Aucune validation des entrées** → schémas **Joi** sur auth/commandes/stock (correctif 14).
- **Dépendances vulnérables** (dont nodemailer high) → `npm audit fix` ; services déployés à
  0 vulnérabilité (correctif 18).
- **Route DELETE sans contrôle admin**, code mort et doublons → nettoyé (correctifs 3 et 19).
- **Exposition des interfaces de supervision** → basic-auth Caddy + ports hôte retirés
  (correctifs 30 et 35) — vérifié : 401 sans identifiants.

Bonnes pratiques imposées par le cahier des charges et respectées : `.env` + `.gitignore`
(0 fichier `.env` versionné), `try/catch` sur les opérations critiques, `connect-flash` pour
les messages temporaires, **ESLint + Prettier** (0 erreur), **Winston**, **Debug** pour le dev.

E29 – Générer la documentation à partir du code source et mettre à jour le journal des évolutions (changelog). *

### Réponse E29

- **Documentation d'API générée depuis le code** : `scripts/generate-docs.js` extrait les routes
  Express et génère `doc/API.md` (`npm run docs`) — 10 routes documentées.
- **Document de rendu** : `RENDU/DOCUMENT-RENDU.md` (`npm run rendu`) — la section « Séquences
  détaillées » est **générée automatiquement** depuis l'historique git (marqueurs AUTO), avec les
  captures d'écran (pages du site, supervision) ; la checklist est cochée.
- **Journal des évolutions (changelog)** : `RESSOURCES/CORRECTIONS.md` — 39 corrections,
  convention stricte 1 correction = 1 commit = 1 partie, chaque entrée avec commit (SHA réel),
  fichiers, problème, correction et vérification.
- **Documentation utilisateur / opérateur** : `README.md` (présentation, architecture,
  environnements, premier démarrage, comptes administrateur auto-créés, dépannage) et
  `RESSOURCES/RAPPORT.md` (analyse argumentée : hébergement, zone DNS, architecture, sécurité,
  supervision).