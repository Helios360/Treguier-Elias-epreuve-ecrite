// scripts/generate-docs.js
// Génère doc/API.md à partir des routes Express du backend.
// Régénérable à volonté : `npm run docs`.
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'backend', 'routes');
const outFile = path.join(__dirname, '..', 'doc', 'API.md');

// Préfixes de montage (cf. backend/server.js)
const MOUNT = {
  productRoutes: '/api/products',
  orderRoutes: '/api/orders',
  authRoutes: '/api/auth',
  messages: '/api/messages',
};

const files = fs
  .readdirSync(routesDir)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
  .sort();

const lineRe = /router\.(get|post|put|delete|patch)\(\s*(?:'([^']*)'|"([^"]*)")\s*(?:,\s*(.*?))?\)\s*;?\s*(?:\/\/.*)?$/;

const rows = [];
for (const file of files) {
  const base = file.replace(/\.js$/, '');
  const prefix = MOUNT[base] || `/${base}`;
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  for (const line of content.split('\n')) {
    const m = lineRe.exec(line.trim());
    if (!m) continue;
    const method = m[1].toUpperCase();
    const routePath = m[2] || m[3] || '';
    const middlewares = (m[4] || '').trim() || '—';
    const full = ((prefix + routePath).replace(/\/+$/, '') || prefix).replace(/\|/g, '\\|');
    rows.push(`| ${method} | \`${full}\` | ${middlewares.replace(/\|/g, '\\|')} |`);
  }
}

const doc = [
  "# Documentation de l'API",
  '',
  '> Fichier **généré automatiquement** par `npm run docs` (`scripts/generate-docs.js`).',
  '> Ne pas modifier à la main : régénérer après tout changement de routes.',
  '',
  '| Méthode | Chemin | Middlewares |',
  '|---------|--------|-------------|',
  ...rows,
  '',
  `_Généré le ${new Date().toISOString()}_`,
  '',
].join('\n');

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, doc);
console.log(`Documentation générée : ${path.relative(process.cwd(), outFile)} (${rows.length} routes)`);
