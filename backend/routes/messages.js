// backend/routes/messages.js
const express = require('express');

const router = express.Router();

// Renvoie puis vide les messages flash (temporaires) destinés au client.
router.get('/', (req, res) => {
  res.json({ messages: req.flash() });
});

module.exports = router;
