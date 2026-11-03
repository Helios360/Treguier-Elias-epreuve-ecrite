# Treguier-Elias-epreuve-ecrite — Épreuve écrite Cloud-Campus

Application e-commerce **MERN** conteneurisée, à mettre en production et à maintenir
(épreuves E21 → E29).

---

## Sommaire

- [Premier démarrage](#premier-démarrage)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Environnements](#environnements)
- [Redéploiement](#redéploiement)
- [Variables d'environnement](#variables-denvironnement)
- [DNS / domaine](#dns--domaine)
- [Structure des Dockerfiles](#structure-des-dockerfiles)
- [Liens utiles](#liens-utiles)
- [Documentation](#documentation)

---

## Premier démarrage

**Prérequis** : Docker (avec Compose V2), git, un domaine avec enregistrement wildcard
pointant sur l'IP publique, ports 80 et 443 ouverts.

```bash
# 1. Cloner et se placer dans le dépôt
git clone <url-du-dépôt> Treguier-Elias-epreuve-ecrite
cd Treguier-Elias-epreuve-ecrite

# 2. Configurer les secrets
cp .env.example .env
# → Éditer .env : renseigner TOUTES les variables (domaine, mots de passe…)

# 3. Lancer la production (build des images + réseaux automatiques)
docker compose build
docker compose run --rm backend node seeder.js   # catalogue + compte admin (une fois)
docker compose up -d

# 4. Lancer la pré-production (après la prod : partage le réseau proxy)
docker compose -p symnodes-preprod -f docker-compose.preprod.yml up -d

# 5. Lancer la supervision (Prometheus / Grafana / Alertmanager)
docker compose -p symnodes-monitoring -f docker-compose.monitoring.yml up -d

# 6. Vérifier
curl -sI https://symnodes.com
curl -sI https://preprod.symnodes.com
curl -sI https://grafana.symnodes.com
```

> Les réseaux Docker `traefik-proxy` et `symnodes-app` sont créés automatiquement par
> la stack de production (première exécution de `docker compose up -d`).

Prérequis réseau : redirection TCP **443** de la box vers le serveur ; certificats TLS
Let's Encrypt obtenus automatiquement par **Caddy** (HTTP-01 sur le port 80, redirigé vers 443).

### Comptes administrateur — création automatique

Aucun compte n'est à créer à la main. Détail de ce qui se passe au premier lancement :

| Service                          | Identifiant                               | Création                                                                                |
| -------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| MongoDB (root)                   | `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | **Auto**, à l'initialisation du volume `mongo-data`                                     |
| Grafana                          | `admin` / `GRAFANA_ADMIN_PASSWORD`        | **Auto**, au premier démarrage de Grafana                                               |
| App (https://symnodes.com/admin) | `ADMIN_USERNAME` / `ADMIN_PASSWORD`       | **Auto** : `seeder.js` à l'étape 3, puis `seed-admin.js` à chaque `./scripts/deploy.sh` |
| Prometheus / Alertmanager        | `admin` / **changez-moi**                 | Aucun compte : basic-auth statique dans `caddy/Caddyfile`                               |

- Les valeurs `ADMIN_*` sont transmises au conteneur par le compose ; si elles sont absentes
  du `.env`, le défaut est `admin` / `admin@example.com` / `admin1234`.
- `seed-admin.js` est **idempotent** : il crée l'admin s'il manque, réaligne rôle et mot
  de passe sur le `.env` si besoin, et **ne touche pas au catalogue**. Changer
  `ADMIN_PASSWORD` puis relancer `./scripts/deploy.sh` suffit donc à appliquer le
  nouveau mot de passe.
- `seeder.js` (étape 3) réinitialise le catalogue produits : à ne lancer qu'une fois.

> ⚠️ Deux mots de passe doivent être changés avant une exposition publique : celui du
> basic-auth (`caddy/Caddyfile`) et `ADMIN_PASSWORD` / `GRAFANA_ADMIN_PASSWORD` (`.env`).
> Générer le hash basic-auth : `docker compose exec caddy caddy hash-password --plaintext '…'`.

### Dépannage

- **Caddy répond « config is unchanged »** : le montage de fichier unique a figé l'ancien
  inode après un `git pull`. Solution : relancer `./scripts/deploy.sh` (montage répertoire)
  ou recréer le conteneur : `docker compose up -d --force-recreate caddy`.
- **502 sur /api/** : le frontend nginx a figé l'IP du backend après sa recréation.
  Solution : redémarrer le frontend : `docker compose restart frontend`.
  (Le fix permanent — resolver DNS — est dans le code ; reconstruire l'image l'applique.)
- **Erreur EACCES / logger.js** : le fichier est en mode 600 sur l'hôte et `COPY`
  le copie en root. Solution : `docker compose build <service>` avec le Dockerfile corrigé
  (`COPY --chown=node:node`).
- **Alertmanager crash-loop** : la config utilisait un flag Prometheus inexistant.
  Solution : le commit 7763f7a remplace par un entrypoint qui fait la substitution des
  variables. Recréer le conteneur : `docker compose -p symnodes-monitoring
-f docker-compose.monitoring.yml up -d --force-recreate alertmanager`.

## Stack technique

- **Frontend** : React (react-scripts), Context API, Tailwind CSS, axios.
- **Backend** : Node.js / Express, Mongoose (MongoDB).
- **Microservices** : `notifications` (NodeMailer), `stock-management`.
- **Gateway** : point d'entrée des microservices (proxy `express-http-proxy`).
- **Base de données** : MongoDB.
- **Infra** : Docker / Docker Compose, Caddy (reverse-proxy + TLS automatique), Nginx (frontend).

## Architecture

```
frontend (React build → Nginx) ──/api──► backend (Express/Mongoose) ──► MongoDB
                                             │
                                             ▼
                                          gateway ──► notifications (email)
                                                  └─► stock-management
```

- Le **frontend** est servi par Nginx et proxifie `/api` vers le backend (même origine).
- Le **backend** est la seule API publique ; il appelle le **gateway** en interne.
- Le **gateway** route vers les microservices `notifications` et `stock-management`.
- **MongoDB** n'est jamais exposé publiquement.

## Environnements

| Environnement  | Fichier compose              | Domaine                | Usage         |
| -------------- | ---------------------------- | ---------------------- | ------------- |
| Développement  | `docker-compose.dev.yml`     | localhost              | hot-reload    |
| Pré-production | `docker-compose.preprod.yml` | `preprod.symnodes.com` | qualification |
| Production     | `docker-compose.yml`         | `symnodes.com`         | production    |

Tous partagent le reverse-proxy **Caddy** (réseau `traefik-proxy`), défini dans la stack
de production.

## Démarrage rapide (dev)

```bash
docker compose -f docker-compose.dev.yml up --build
# Frontend : http://localhost:3000 — API : http://localhost:5000/api
```

## Redéploiement

Une fois la stack en service, **un seul point d'entrée** applique une mise à jour :

```bash
./scripts/deploy.sh
```

Le script est idempotent et enchaîne : `git pull`, build + `up -d` de la production,
mise à jour de la supervision, rechargement à chaud de Caddy, puis vérification des
URLs publiques et de l'état des conteneurs (code de sortie non nul en cas d'échec).
Il n'exécute jamais `docker compose down` ni `--remove-orphans`.

> **Montages de configuration** — Les fichiers `Caddyfile`, `prometheus.yml`,
> `alert.rules.yml` et `alertmanager.template.yml` sont montés via leur **répertoire**
> (`./caddy`, `./monitoring/prometheus`, `./monitoring/alertmanager`) et non fichier
> par fichier. Un bind mount de fichier unique reste en effet épinglé sur l'ancien
> inode lorsque `git` remplace le fichier lors d'un `pull` : le conteneur continuait
> de lire la version périmée et `caddy reload` répondait « config is unchanged ».
> Le montage de répertoire suit les remplacements de fichiers, donc `caddy reload`
> suffit et reste sans coupure. Prometheus et Alertmanager, eux, relisent leur
> configuration au démarrage : `deploy.sh` les recrée pour garantir la prise en compte.

Prérequis réseau : redirection TCP **443** de la box vers le serveur ; certificats TLS
Let's Encrypt obtenus automatiquement par **Caddy** (HTTP-01 sur le port 80, redirigé vers 443).

## Variables d'environnement

Voir `.env.example`. Variables principales :

| Variable                                                 | Rôle                                       |
| -------------------------------------------------------- | ------------------------------------------ |
| `DOMAIN`, `DOMAIN_URL`, `PREDOMAIN_URL`                  | Domaine et URLs des environnements         |
| `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `MONGO_DBNAME` | Base de données                            |
| `JWT_SECRET`                                             | Signature des tokens JWT                   |
| `NOTIFY_RECIPIENT`                                       | Destinataire des notifications de commande |
| `EMAIL_USER`, `EMAIL_APPLICATION_PASSWORD`               | SMTP du microservice notifications         |

Le fichier `.env` est ignoré par git (secrets).

## DNS / domaine

Domaine `symnodes.com` chez Infomaniak. IP publique **statique** ⇒ enregistrements A fixes.

```dns
$TTL 3600
@       IN SOA  ns11.infomaniak.ch. hostmaster.infomaniak.ch. (2026110302 10800 3600 605800 3600)
@       3600 IN NS   ns11.infomaniak.ch.
@       3600 IN NS   ns12.infomaniak.ch.
@       3600 IN A    176.176.123.209
*       3600 IN A    176.176.123.209
@       3600 IN TXT  "v=spf1 -all"
_dmarc  3600 IN TXT  "v=DMARC1; p=reject;"
```

## Structure des Dockerfiles

Chaque service possède son propre `Dockerfile` et `.dockerignore`, au plus près de son code
(c'est le _contexte de build_ Docker) :

```
backend/Dockerfile
gateway/Dockerfile
microservices/notifications/Dockerfile
microservices/stock-management/Dockerfile
frontend/Dockerfile              (+ frontend/nginx.conf)
```

Un unique Dockerfile à la racine ne conviendrait pas : chaque service a sa propre base,
son `CMD` et son contexte. Docker recommande un Dockerfile par contexte de build.

## Liens utiles

### Application

| Cible                      | URL                                                          |
| -------------------------- | ------------------------------------------------------------ |
| Production                 | https://symnodes.com                                         |
| Pré-production             | https://preprod.symnodes.com                                 |
| Interface d'administration | https://symnodes.com/admin _(compte de rôle `admin` requis)_ |
| Admin (pré-prod)           | https://preprod.symnodes.com/admin                           |
| API (exemple)              | https://symnodes.com/api/products                            |
| Documentation d'API        | `doc/API.md`                                                 |

Routes front : `/` (accueil) · `/cart` · `/login` · `/register` · `/shippig_payment` · `/order` · `/admin`.

### Supervision (E26) — exposée sur des sous-domaines

| Service      | URL publique                      | Identifiants                            |
| ------------ | --------------------------------- | --------------------------------------- |
| Grafana      | https://grafana.symnodes.com      | `admin` / `$GRAFANA_ADMIN_PASSWORD`     |
| Prometheus   | https://prometheus.symnodes.com   | basic-auth `admin` / mot de passe Caddy |
| Alertmanager | https://alertmanager.symnodes.com | basic-auth `admin` / mot de passe Caddy |

Dashboard **`symnodes — Vue d'ensemble`** (dossier `symnodes`) :
https://grafana.symnodes.com/d/symnodes-overview

Il est **provisionné par fichier** — `monitoring/grafana/provisioning/dashboards/json/` —
donc versionné et recréé à l'identique sur toute nouvelle installation : disponibilité des
deux environnements (sondes blackbox), débit et latence p95 du backend, mémoire Node.js,
CPU/RAM/disque de l'hôte, et consommation par conteneur.

Prometheus et Alertmanager sont protégés par **basic-auth** (Caddy). Le mot de passe se
règle via le hash dans `caddy/Caddyfile` (`docker compose exec caddy caddy hash-password --plaintext '...'`).
Lancement : `docker compose -p symnodes-monitoring -f docker-compose.monitoring.yml up -d` (nom de projet distinct ; aucun port hôte exposé, tout passe par le réseau Docker).

> Couvert par l'enregistrement wildcard `*` de la zone DNS (`@` pour l'apex).

### Interne (dans le réseau Docker)

| Service              | Cible                   |
| -------------------- | ----------------------- |
| Backend (API)        | `backend:5000`          |
| Métriques Prometheus | `backend:5000/metrics`  |
| Gateway              | `gateway:8000`          |
| Notifications        | `notifications:4002`    |
| Stock                | `stock-management:4003` |
| MongoDB              | `mongo:27017`           |

### CI/CD

Pipeline GitHub Actions : onglet **Actions** du dépôt (`.github/workflows/ci.yml`).

## Documentation

- `RESSOURCES/` — ressources de l'épreuve : `SOMMAIRE.md`, `CAHIER DES CHARGES.md`,
  `TABLEAU DE COMPETENCES.md`, `RAPPORT.md`, `CORRECTIONS.md` (registre : 1 correction = 1 commit).
- `RENDU/DOCUMENT-RENDU.md` — document à transmettre (séquences générées via `npm run rendu`).
- `doc/API.md` — documentation d'API générée via `npm run docs`.
- `scripts/` — `harden-host.sh` (durcissement), `generate-docs.js`, `generate-rendu.js`.
