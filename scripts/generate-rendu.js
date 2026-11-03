// scripts/generate-rendu.js
// Remplit la section « Séquences » de RENDU/DOCUMENT-RENDU.md à partir de
// l'historique git. Régénérable : `npm run rendu`.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, '..', 'RENDU', 'DOCUMENT-RENDU.md');
const START = '<!-- AUTO:SEQUENCES:START -->';
const END = '<!-- AUTO:SEQUENCES:END -->';

// Historique git (sha court | date | sujet), du plus ancien au plus récent
const raw = execSync("git log --reverse --pretty=format:'%h|%ad|%s' --date=short", {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);

const rows = raw.map((line) => {
  const [sha, date, ...rest] = line.split('|');
  return `| ${date} | \`${sha}\` | ${rest.join('|')} |`;
});

const block = [
  '| Date | Commit | Tâche réalisée |',
  '|------|--------|----------------|',
  ...rows,
  '',
  `_Séquences générées automatiquement depuis l'historique git le ${new Date().toISOString()} (${rows.length} commits)._`,
].join('\n');

let doc = fs.readFileSync(docPath, 'utf8');
const i = doc.indexOf(START);
const j = doc.indexOf(END);
if (i === -1 || j === -1) {
  console.error('Marqueurs AUTO:SEQUENCES introuvables dans DOCUMENT-RENDU.md');
  process.exit(1);
}
doc = doc.slice(0, i + START.length) + '\n' + block + '\n' + doc.slice(j);
fs.writeFileSync(docPath, doc);
console.log(`Séquences mises à jour dans ${path.relative(process.cwd(), docPath)} (${rows.length} commits)`);
