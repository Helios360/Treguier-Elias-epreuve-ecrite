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

- Port-forward de la box : **TCP 443 → homeserver** (reverse-proxy Traefik).
  Le port 80 n'est pas nécessaire (certificats obtenus en challenge **DNS-01**).
- **Certificats TLS** : Let's Encrypt via le provider **lego `infomaniak`**
  (variable `INFOMANIAK_ACCESS_TOKEN`, token API scope « domain » créé sur
  `manager.infomaniak.com/v3/infomaniak-api`). Permet un certificat **wildcard
  `*.symnodes.com`** sans ouvrir le port 80.
- Production et pré-production partagent l'IP : le routage se fait par **en-tête Host**
  (`symnodes.com` / `www.symnodes.com` → prod, `preprod.symnodes.com` → pré-prod).
- L'administration (SSH, Docker, commandes de production) reste derrière le **VPN
  WireGuard**, jamais exposée publiquement.
