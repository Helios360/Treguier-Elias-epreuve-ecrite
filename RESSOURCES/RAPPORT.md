# Rapport — Épreuve écrite Cloud-Campus

> Projet `Treguier-Elias-epreuve-ecrite` — application e-commerce full-stack
> (Express/Mongoose + gateway + microservices + React), conteneurisée.

---

## 1. Hébergement, nommage et exposition (E21 / E23)

### 1.1 Choix d'hébergement

- **Production** : homeserver auto-hébergé (« private cloud »), IP publique **statique**
  `176.176.123.209`. Aucun CGNAT (l'endpoint WireGuard `helli0s.ddns.net` résout vers
  cette même IP, donc le port-forwarding est maîtrisé).
- **Pré-production** : même homeserver, mais stack Docker et sous-domaine isolés
  (`preprod.symnodes.com`).
- **Développement** : local.

Justification : maîtrise totale de l'infrastructure, coût nul, souveraineté des données,
et réutilisation d'un accès réseau déjà sécurisé par VPN. IP statique ⇒ pas de dépendance
à un service DDNS.

### 1.2 Nom de domaine

- Domaine : **symnodes.com**, hébergé chez **Infomaniak** (serveurs de noms
  `ns11.infomaniak.ch`, `ns12.infomaniak.ch`).
- IP publique statique ⇒ **enregistrements A fixes**, pas de mise à jour dynamique.
- Diffusion en **IPv4 uniquement** : IPv6 volontairement non publiée tant que le routage
  entrant IPv6 n'est pas vérifié (évite que les clients préfèrent une AAAA non joignable).

### 1.3 Zone DNS complète (`symnodes.com`)

```dns
; Domain: symnodes.com
$TTL 3600
@       IN SOA  ns11.infomaniak.ch. hostmaster.infomaniak.ch. (2026110301 10800 3600 605800 3600)
@       3600 IN NS   ns11.infomaniak.ch.
@       3600 IN NS   ns12.infomaniak.ch.

; --- Production (homeserver) ---
@       3600 IN A    176.176.123.209

; --- www (même cible que la prod) ---
www     3600 IN A    176.176.123.209

; --- Pré-production (homeserver, stack isolée) ---
preprod 3600 IN A    176.176.123.209
grafana       3600 IN A    176.176.123.209
prometheus    3600 IN A    176.176.123.209
alertmanager  3600 IN A    176.176.123.209

; --- Messagerie : domaine non émetteur ---
@       3600 IN TXT  "v=spf1 -all"
_dmarc  3600 IN TXT  "v=DMARC1; p=reject;"
```

Modifications par rapport à la zone Infomaniak initiale :

| Enregistrement | Avant | Après |
|----------------|-------|-------|
| `@ A` | `84.16.66.164` (parking Infomaniak) | `176.176.123.209` (homeserver) |
| `@ AAAA` | `2001:1600:0:aaaa::2:14` (parking) | supprimé (IPv4 only) |
| `www A` | `84.16.66.164` | `176.176.123.209` |
| `www AAAA` | `2001:1600:0:aaaa::2:14` | supprimé |
| `@ / www TXT` | `"1|symnodes.fr"`, `"p|https"` | supprimés (marqueurs de parking) |
| `preprod A` | — | `176.176.123.209` (créé) |
| `NS`, `SOA`, `SPF`, `DMARC` | — | conservés |

### 1.4 Exposition réseau et TLS

- Port-forward de la box : **TCP 80 et 443 → homeserver** (reverse-proxy Caddy).
- **Certificats TLS** : Let's Encrypt obtenus automatiquement par **Caddy** via HTTP-01
  (port 80 ouvert). Caddy gère le renouvellement et la redirection HTTP → HTTPS.
- Production et pré-production partagent l'IP : le routage se fait par **en-tête Host**
  (`symnodes.com` / `www.symnodes.com` → prod, `preprod.symnodes.com` → pré-prod).
- L'administration (SSH, Docker, commandes de production) reste derrière le **VPN
  WireGuard**, jamais exposée publiquement.

---

## 2. Architecture et conteneurisation

- **Services** : `frontend` (React build → Nginx), `backend` (API Express/Mongoose),
  `gateway` (proxy `express-http-proxy`), `notifications` (NodeMailer),
  `stock-management` (gestion du stock en base), `mongo`.
- **Contexte de build** : chaque service dispose de son `Dockerfile` et `.dockerignore`.
- **Environnements** : `docker-compose.yml` (prod), `docker-compose.preprod.yml`
  (pré-prod), `docker-compose.dev.yml` (dev local).
- **Reverse-proxy** : Caddy (TLS Let's Encrypt automatique) — `symnodes.com`,
  `www.symnodes.com`, `preprod.symnodes.com`.
- **Réseaux** : `traefik-proxy` (proxy ↔ frontend), `symnodes-app` (interne applicatif).
- **Persistance** : volume `mongo-data` ; MongoDB non exposé publiquement.

## 3. Fonctionnalités et points d'effort

- Catalogue produits, panier (Context API : ajout / quantité / retrait / vidage).
- Tunnel de commande (adresse, transporteur, paiement) puis synthèse et validation.
- Gestion des rôles `user` / `admin` (JWT).
- Microservices : notifications email et gestion du stock (décentralisée).
- Gateway mutualisant l'accès aux microservices.
- Points techniques travaillés : conteneurisation multi-services, secrets, TLS,
  validation des entrées, authentification par cookie sécurisé, supervision.

## 4. Sécurité et robustesse (E28)

- Variables d'environnement (`.env`) + `.gitignore` (secrets hors dépôt).
- Validation des entrées avec **Joi** (auth, commandes, stock).
- JWT en **cookie HTTPOnly** (`secure` en prod) — plus de token en `localStorage`.
- Gestion d'erreurs `try/catch` sur les opérations critiques.
- Messages temporaires via **connect-flash**.
- Qualité de code : **ESLint** + **Prettier**.
- Logs via **Winston** ; assistance dev via **Debug**.
- Dépendances mises à jour (`npm audit`) ; 0 vulnérabilité sur les services déployés.

## 5. Intégration et déploiement continus (E24)

GitHub Actions (`.github/workflows/ci.yml`) : lint, tests backend (`node:test`) et
frontend (jest), build des images Docker, puis déploiement de la pré-production (sur
`main`) et de la production (sur tag `v*`) par SSH. Les secrets de déploiement
(`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`) sont à configurer côté
dépôt ; la clé SSH est posée par l'administrateur serveur.

## 6. Journalisation et audit (E25)

- Journalisation des services : Winston (`logs/combined.log`, `logs/error.log`).
- Audit applicatif : piste d'audit dédiée (`logs/audit.log`, JSON) traçant les
  événements sensibles (authentification, commandes, stock).
- Audit système (hôte) : `auditd` et `fail2ban` (script `scripts/harden-host.sh`).

## 7. Supervision et alertes (E26)

- Stack : Prometheus + Grafana + Alertmanager + node-exporter + cAdvisor + blackbox-exporter
  (`docker-compose.monitoring.yml`).
- Métriques applicatives exposées par le backend sur `/metrics` (prom-client).
- Sondes HTTP sur `symnodes.com` et `preprod.symnodes.com`.
- Alertes : indisponibilité d'une cible, échec de sonde HTTP, CPU/RAM/disque élevés ;
  notification par email (Alertmanager → SMTP).
- Interfaces bindées en local (accès via VPN / tunnel SSH), jamais publiques.

## 8. Correction des anomalies (E27)

- `deleteOrder` implémenté et route protégée (rôle admin).
- `validateOrder` persiste le statut ; statut hors enum corrigé.
- Mise à jour du stock à la commande réactivée, déportée dans le microservice dédié.
- Nettoyage du code mort (doublons admin, microservice vide, fichier orphelin).

## 9. Documentation (E29)

- Documentation d'API générée depuis le code : `doc/API.md` (`npm run docs`).
- Journal des évolutions : `RESSOURCES/CORRECTIONS.md` (1 correction = 1 commit).
- Document de rendu : `RENDU/DOCUMENT-RENDU.md` (séquences générées via `npm run rendu`).

## 10. Conclusion

Le projet est conteneurisé, déployé (production + pré-production), sécurisé (secrets,
validation, cookie HTTPOnly, TLS), journalisé et supervisé, avec un CI/CD automatisé et
une documentation générée. Les huit exigences de sécurité/robustesse du cahier des
charges sont couvertes (voir `RESSOURCES/TABLEAU DE COMPETENCES.md`).
