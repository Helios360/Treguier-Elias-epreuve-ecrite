// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // modèle utilisateur
require('dotenv').config();
const authLog = require('debug')('authRoutes:console');
const logger = require('../config/logger');

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true, // inaccessible au JavaScript client (protection XSS)
  secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en prod
  sameSite: 'lax',
  maxAge: 60 * 60 * 1000, // 1 heure (aligné sur l'expiration du JWT)
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  authLog(`Tentative de connexion pour: ${username}`);

  try {
    const user = await User.findOne({ username });
    if (!user) {
      req.flash('error', 'Utilisateur non trouvé');
      return res.status(400).json({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Mot de passe incorrect');
      return res.status(400).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Le token est transmis via un cookie HTTPOnly (jamais exposé au JavaScript client)
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    req.flash('success', 'Connexion réussie.');

    res.json({ role: user.role, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  req.flash('success', 'Déconnexion réussie.');
  res.json({ message: 'Déconnexion réussie.' });
};

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  authLog(`Inscription: ${username}`);

  try {
    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      req.flash('error', 'Cet email est déjà utilisé.');
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Créer un nouvel utilisateur
    const user = new User({ username, email, password });
    await user.save();

    req.flash('success', 'Utilisateur créé avec succès.');
    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  } catch (error) {
    logger.error("Erreur lors de l'inscription", error);
    req.flash('error', 'Une erreur est survenue.');
    res.status(500).json({ message: 'Une erreur est survenue.' });
  }
};
