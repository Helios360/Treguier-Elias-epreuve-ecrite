# Treguier-Elias-epreuve-ecrite — Épreuve écrite Cloud-Campus

Application e-commerce **MERN** conteneurisée, à mettre en production et à maintenir
(épreuves E21 → E29).

---

## Sommaire

- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Environnements](#environnements)
- [Démarrage rapide (dev)](#démarrage-rapide-dev)
- [Déploiement (pré-production / production)](#déploiement-pré-production--production)
- [Variables d'environnement](#variables-denvironnement)
- [DNS / domaine](#dns--domaine)
- [Structure des Dockerfiles](#structure-des-dockerfiles)
- [Documentation](#documentation)

---

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

| Environnement | Fichier compose | Domaine | Usage |
|---------------|-----------------|---------|-------|
| Développement | `docker-compose.dev.yml` | localhost | hot-reload |
| Pré-production | `docker-compose.preprod.yml` | `preprod.symnodes.com` | qualification |
| Production | `docker-compose.yml` | `symnodes.com` | production |

Tous partagent le reverse-proxy **Caddy** (réseau `traefik-proxy`), défini dans la stack
de production.

## Démarrage rapide (dev)

```bash
docker compose -f docker-compose.dev.yml up --build
# Frontend : http://localhost:3000 — API : http://localhost:5000/api
```

## Déploiement (pré-production / production)

Sur le serveur (homeserver) :

```bash
# 1. Variables d'environnement
cp .env.example .env      # renseigner les valeurs

# 2. Production
docker compose build
docker compose run --rm backend node seeder.js   # jeu de données initial
docker compose up -d

# 3. Pré-production (partage le réseau proxy de la prod)
docker compose -p symnodes-preprod -f docker-compose.preprod.yml up -d
```

Prérequis réseau : redirection TCP **443** de la box vers le serveur ; certificats TLS
Let's Encrypt obtenus automatiquement par **Caddy** (HTTP-01 sur le port 80, redirigé vers 443).

## Variables d'environnement

Voir `.env.example`. Variables principales :

| Variable | Rôle |
|----------|------|
| `DOMAIN`, `DOMAIN_URL`, `PREDOMAIN_URL` | Domaine et URLs des environnements |
| `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `MONGO_DBNAME` | Base de données |
| `JWT_SECRET` | Signature des tokens JWT |
| `NOTIFY_RECIPIENT` | Destinataire des notifications de commande |
| `EMAIL_USER`, `EMAIL_APPLICATION_PASSWORD` | SMTP du microservice notifications |

Le fichier `.env` est ignoré par git (secrets).

## DNS / domaine

Domaine `symnodes.com` chez Infomaniak. IP publique **statique** ⇒ enregistrements A fixes.

```dns
$TTL 3600
@       IN SOA  ns11.infomaniak.ch. hostmaster.infomaniak.ch. (2026110301 10800 3600 605800 3600)
@       3600 IN NS   ns11.infomaniak.ch.
@       3600 IN NS   ns12.infomaniak.ch.
@       3600 IN A    176.176.123.209
www     3600 IN A    176.176.123.209
preprod 3600 IN A    176.176.123.209
@       3600 IN TXT  "v=spf1 -all"
_dmarc  3600 IN TXT  "v=DMARC1; p=reject;"
```

## Structure des Dockerfiles

Chaque service possède son propre `Dockerfile` et `.dockerignore`, au plus près de son code
(c'est le *contexte de build* Docker) :

```
backend/Dockerfile
gateway/Dockerfile
microservices/notifications/Dockerfile
microservices/stock-management/Dockerfile
frontend/Dockerfile              (+ frontend/nginx.conf)
```

Un unique Dockerfile à la racine ne conviendrait pas : chaque service a sa propre base,
son `CMD` et son contexte. Docker recommande un Dockerfile par contexte de build.

## Documentation

- `RESSOURCES/` — ressources de l'épreuve : `SOMMAIRE.md`, `CAHIER DES CHARGES.md`,
  `TABLEAU DE COMPETENCES.md`, `RAPPORT.md`, `CORRECTIONS.md` (registre : 1 correction = 1 commit).
- `RENDU/DOCUMENT-RENDU.md` — document à transmettre (séquences générées via `npm run rendu`).
- `doc/API.md` — documentation d'API générée via `npm run docs`.
- `scripts/` — `harden-host.sh` (durcissement), `generate-docs.js`, `generate-rendu.js`.
