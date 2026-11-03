// backend/routes/authRoutes.js
const express = require('express');
const { login, register } = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { loginSchema, registerSchema } = require('../validation/schemas');

const router = express.Router();

router.post('/login', validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);

module.exports = router;
