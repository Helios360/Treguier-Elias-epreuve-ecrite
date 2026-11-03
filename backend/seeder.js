// backend/seeder.js
// Jeu de données initial : catalogue produits + compte administrateur.
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const User = require('./models/User');
const logger = require('./config/logger');

dotenv.config();

// Connexion à MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logger.info('MongoDB connecté pour le seed'))
  .catch((err) => logger.error('Erreur de connexion à MongoDB', err));

// Catalogue de produits
const products = [
  { name: 'Ordinateur Portable', price: 1000, description: 'Un ordinateur portable performant pour tous vos besoins.', stock: 20 },
  { name: 'Smartphone', price: 700, description: 'Un smartphone moderne avec un écran OLED.', stock: 50 },
  { name: 'Casque Audio', price: 150, description: 'Un casque audio sans fil avec réduction de bruit.', stock: 30 },
  { name: 'Tablette', price: 400, description: 'Une tablette légère et puissante.', stock: 25 },
  { name: 'Clavier Mécanique', price: 120, description: 'Un clavier mécanique pour les gamers.', stock: 15 },
];

// Crée (ou promeut) un compte administrateur (identifiants via variables d'env)
const seedAdmin = async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin1234';

  const existing = await User.findOne({ username });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    logger.info(`Admin mis à jour (rôle admin) : ${username}`);
    return;
  }

  await User.create({ username, email, password, role: 'admin' });
  logger.info(`Admin créé : ${username}`);
};

const seed = async () => {
  try {
    await Product.deleteMany();
    await Product.insertMany(products);
    logger.info('Jeux de produits insérés avec succès !');

    await seedAdmin();

    process.exit(0);
  } catch (error) {
    logger.error("Erreur lors de l'insertion des données", error);
    process.exit(1);
  }
};

seed();
