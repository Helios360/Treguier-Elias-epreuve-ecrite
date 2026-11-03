// backend/config/audit.js
// Piste d'audit applicative : trace les événements sensibles (authentification,
// commandes, stock) dans un fichier dédié, en JSON structuré.
const fs = require('fs');
const path = require('path');
const winston = require('winston');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: path.join(LOG_DIR, 'audit.log') })],
});

module.exports = {
  /**
   * Enregistre un événement d'audit.
   * @param {string} event - nom de l'événement (ex. 'login_success')
   * @param {object} [data] - données contextuelles non sensibles
   */
  log: (event, data = {}) => auditLogger.info({ event, ...data }),
};
