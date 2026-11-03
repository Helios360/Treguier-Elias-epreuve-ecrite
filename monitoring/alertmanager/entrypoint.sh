#!/bin/sh
# Rend la configuration Alertmanager en substituant les variables d'environnement,
# puis lance Alertmanager sur le fichier généré.
set -e

sed \
  -e "s|\${ALERT_EMAIL}|${ALERT_EMAIL}|g" \
  -e "s|\${EMAIL_USER}|${EMAIL_USER}|g" \
  -e "s|\${EMAIL_APPLICATION_PASSWORD}|${EMAIL_APPLICATION_PASSWORD}|g" \
  -e "s|\${SMTP_SMARTHOST}|${SMTP_SMARTHOST}|g" \
  /etc/alertmanager/alertmanager.template.yml > /alertmanager/alertmanager.yml

exec /bin/alertmanager --config.file=/alertmanager/alertmanager.yml
