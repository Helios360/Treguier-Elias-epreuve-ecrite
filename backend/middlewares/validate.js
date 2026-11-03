// backend/middlewares/validate.js
// Middleware générique de validation des entrées avec Joi.
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      message: 'Données invalides',
      details: error.details.map((detail) => detail.message),
    });
  }

  req.body = value; // valeurs validées (et coercées) uniquement
  next();
};

module.exports = validate;
