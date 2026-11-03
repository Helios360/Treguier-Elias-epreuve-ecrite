#!/usr/bin/env bash
# =============================================================================
# Durcissement de l'hôte (E22) — homeserver de production
# -----------------------------------------------------------------------------
# ⚠️  À EXÉCUTER EN ROOT, APRÈS RELECTURE, sur le serveur (pas depuis le poste).
# ⚠️  Hypothèse : distribution basée sur APT (Debian/Ubuntu).
#     Sur Arch : remplacer apt/unattended-upgrades par
#     `pacman -Syu` + `pacman -S ufw fail2ban audit` et adapter.
# ⚠️  CONFIGURER LA CLÉ SSH AVANT de désactiver PasswordAuthentication,
#     sinon risque de perte d'accès.
# =============================================================================
set -euo pipefail

echo "[1/6] Mises à jour de sécurité automatiques"
apt-get update
apt-get install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "[2/6] Outils d'audit et anti-intrusion"
apt-get install -y auditd fail2ban

echo "[3/6] Pare-feu (ufw : refus par défaut, ouverture SSH + HTTPS)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 443/tcp
ufw --force enable

echo "[4/6] SSH : authentification par clé uniquement, root restreint"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh 2>/dev/null || systemctl reload sshd

echo "[5/6] fail2ban et auditd activés au démarrage"
systemctl enable --now fail2ban
systemctl enable --now auditd

echo "[6/6] Terminé."
echo "  Vérifier :  ufw status verbose"
echo "              systemctl status fail2ban auditd"
echo
echo "Rappel : l'accès d'administration (SSH, Docker, commandes prod) doit rester"
echo "derrière le VPN WireGuard. Seul le port 443 (reverse-proxy Caddy) est public."
