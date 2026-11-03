// backend/validation/schemas.js
// Schémas de validation des entrées (Joi).
const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
      })
    )
    .min(1)
    .required(),
  shippingAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required(),
  }).required(),
  paymentMethod: Joi.string().valid('Carte bancaire', 'PayPal', 'Virement').required(),
  shippingMethod: Joi.string().valid('colissimo', 'chronopost').required(),
});

const updateStockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createOrderSchema,
  updateStockSchema,
};
