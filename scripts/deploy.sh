#!/usr/bin/env bash
#
# Déploiement idempotent de la stack symnodes.
#
# Objectif : rendre le redéploiement reproductible et sans erreur.
#   - Les configurations Caddy / Prometheus / Alertmanager sont montées en
#     RÉPERTOIRE (et non en fichier unique) : un montage de fichier reste
#     épinglé sur l'ancien inode après un `git pull` (git remplace le fichier),
#     et le conteneur continuait de lire la version périmée.
#   - Caddy est rechargé à chaud (zéro coupure) : le montage répertoire fait
#     que le fichier lu est toujours à jour.
#   - Prometheus et Alertmanager relisent leur configuration au démarrage :
#     ils sont donc recréés, pour que toute modification de règle ou de
#     template soit réellement prise en compte.
#
# Ce script n'exécute JAMAIS `docker compose down` ni `--remove-orphans`,
# et ne recrée pas les services applicatifs de production sans nécessité.
#
# Usage : ./scripts/deploy.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

MONITORING_COMPOSE="docker-compose.monitoring.yml"
MONITORING_PROJECT="symnodes-monitoring"
CADDY_SERVICE="caddy"
CADDY_SERVICE_FULL="treguier-elias-epreuve-ecrite-caddy-1"

# --- Couleurs (désactivées si la sortie n'est pas un terminal) -------------
if [ -t 1 ]; then
  BOLD=$'\033[1m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; OFF=$'\033[0m'
else
  BOLD=''; GREEN=''; RED=''; YELLOW=''; OFF=''
fi

step() { printf '\n%s==> %s%s\n' "$BOLD" "$*" "$OFF"; }
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$*"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$OFF" "$*"; }
die()  { printf '  %s✗%s %s\n' "$RED" "$OFF" "$*" >&2; exit 1; }

# --- Docker : sudo seulement si nécessaire --------------------------------
if docker info >/dev/null 2>&1; then
  DC=(docker compose)
else
  warn "Accès au démon Docker via sudo"
  DC=(sudo docker compose)
fi

# --- 1. Récupération du code ---------------------------------------------
step "Récupération du code (git pull --ff-only)"
git pull --ff-only
ok "HEAD : $(git log --oneline -1)"

# --- 2. Contrôle des fichiers de configuration ---------------------------
step "Contrôle des fichiers de configuration"
# Un montage de répertoire n'a de sens que si le fichier attendu est présent.
for f in caddy/Caddyfile \
         monitoring/prometheus/prometheus.yml \
         monitoring/prometheus/alert.rules.yml \
         monitoring/alertmanager/alertmanager.template.yml \
         monitoring/alertmanager/entrypoint.sh \
         monitoring/grafana/provisioning; do
  [ -e "$f" ] || die "Fichier/dossier de configuration manquant : $f"
done
ok "Configurations présentes"

# --- 3. Stack de production ----------------------------------------------
# `up -d` recrée uniquement les services dont l'image ou la définition a changé.
# Aucun `down`, aucun `--remove-orphans`.
step "Stack de production"
"${DC[@]}" build
"${DC[@]}" up -d
ok "Production à jour"

# --- Compte administrateur applicatif ------------------------------------
# seed-admin.js est idempotent et NE supprime rien (contrairement à seeder.js,
# qui réinitialise le catalogue) : il peut donc tourner à chaque déploiement.
step "Compte administrateur applicatif"
"${DC[@]}" run --rm --no-deps backend node seed-admin.js
ok "Compte administrateur présent (rôle admin)"

# --- 4. Stack de supervision ---------------------------------------------
# Prometheus et Alertmanager lisent leur config au démarrage : sans recréation,
# une modification de règle/template resterait non appliquée.
step "Stack de supervision ($MONITORING_PROJECT)"
"${DC[@]}" -p "$MONITORING_PROJECT" -f "$MONITORING_COMPOSE" up -d \
  --force-recreate prometheus alertmanager
"${DC[@]}" -p "$MONITORING_PROJECT" -f "$MONITORING_COMPOSE" up -d
ok "Supervision à jour"

# --- 5. Rechargement de Caddy (à chaud, sans redémarrage) ----------------
step "Rechargement de Caddy"
# Le montage de ./caddy sur /etc/caddy garantit que ce fichier est à jour.
if "${DC[@]}" exec -T "$CADDY_SERVICE" \
     caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
  ok "Caddy rechargé (aucun conteneur redémarré)"
else
  die "Échec du rechargement Caddy — vérifier : docker compose logs caddy --tail=80"
fi

# --- 6. Vérifications -----------------------------------------------------
step "Vérifications HTTP"

# check <url> <code attendu> [identifiants]
check() {
  local url="$1" expected="$2" creds="${3:-}"
  local args=(-s -o /dev/null -w '%{http_code}' --max-time 25
              --retry 5 --retry-delay 3 --retry-connrefused)
  [ -n "$creds" ] && args+=(-u "$creds")
  local code
  code="$(curl "${args[@]}" "$url" || echo 000)"
  if [ "$code" = "$expected" ]; then
    ok "$url → $code"
  else
    warn "$url → $code (attendu : $expected)"
    return 1
  fi
}

# Les sous-domaines de supervision émettent leur certificat au premier appel :
# on tolère donc un premier passage manqué, avec nouvelles tentatives.
failures=0
check "https://symnodes.com"             200 || failures=$((failures + 1))
check "https://preprod.symnodes.com"     200 || failures=$((failures + 1))
check "https://grafana.symnodes.com"     302 || failures=$((failures + 1))
check "https://prometheus.symnodes.com"  401 || failures=$((failures + 1))
check "https://alertmanager.symnodes.com" 401 || failures=$((failures + 1))

# --- 7. État des conteneurs ----------------------------------------------
step "État de la supervision"
"${DC[@]}" -p "$MONITORING_PROJECT" -f "$MONITORING_COMPOSE" ps

# Aucun service ne doit boucler.
restarting="$("${DC[@]}" -p "$MONITORING_PROJECT" -f "$MONITORING_COMPOSE" ps \
  --format '{{.Name}} {{.State}}' 2>/dev/null | awk '$2 != "running" {print $1}')"
if [ -n "$restarting" ]; then
  die "Services non démarrés : $restarting"
fi
ok "Tous les services de supervision sont démarrés"

if [ "$failures" -gt 0 ]; then
  die "$failures vérification(s) HTTP en échec — voir les avertissements ci-dessus"
fi

printf '\n%sDéploiement terminé.%s\n' "$GREEN" "$OFF"
