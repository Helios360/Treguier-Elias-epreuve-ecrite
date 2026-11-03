// backend/seed-admin.js
// Garantit la présence du compte administrateur, au démarrage de la stack.
//
// Différence avec seeder.js : ce script ne supprime RIEN (pas de Product.deleteMany),
// il peut donc être exécuté à chaque `docker compose up -d` sans écraser le catalogue.
//
// Le .env est la source de vérité : rôle et mot de passe sont réalignés si besoin.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const logger = require('./config/logger');

dotenv.config();

const username = process.env.ADMIN_USERNAME || 'admin';
const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'admin1234';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const existing = await User.findOne({ username });

  if (!existing) {
    await User.create({ username, email, password, role: 'admin' });
    logger.info(`Compte administrateur créé : ${username}`);
  } else {
    let changed = false;

    if (existing.role !== 'admin') {
      existing.role = 'admin';
      changed = true;
    }
    if (!(await bcrypt.compare(password, existing.password))) {
      existing.password = password;
      changed = true;
    }

    if (changed) {
      await existing.save();
      logger.info(`Compte administrateur réaligné sur le .env : ${username}`);
    } else {
      logger.info(`Compte administrateur déjà conforme : ${username}`);
    }
  }

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Échec de la synchronisation du compte administrateur', err);
    process.exit(1);
  });
