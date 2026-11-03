// microservices/notifications/logger.js
// Logger structuré simple (sans dépendance externe) pour les microservices.
function log(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'notifications',
    message,
    ...(meta ? { meta } : {}),
  };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else console.log(output);
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
