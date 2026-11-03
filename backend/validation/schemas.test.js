// backend/validation/schemas.test.js
// Tests des schémas Joi (exécutables sans dépendance externe : `node --test`).
const test = require('node:test');
const assert = require('node:assert');
const { registerSchema, loginSchema, createOrderSchema, updateStockSchema } = require('./schemas');

const validAddress = { street: '1 rue', city: 'Paris', postalCode: '75001', country: 'France' };

test('registerSchema accepte un utilisateur valide', () => {
  const { error } = registerSchema.validate({
    username: 'bob',
    email: 'bob@example.com',
    password: 'secret1',
  });
  assert.equal(error, undefined);
});

test('registerSchema rejette un email invalide', () => {
  const { error } = registerSchema.validate({ username: 'bob', email: 'pas-un-email', password: 'secret1' });
  assert.ok(error, 'un email invalide doit être rejeté');
});

test('loginSchema exige username et password', () => {
  const { error } = loginSchema.validate({ username: 'bob' });
  assert.ok(error);
});

test('createOrderSchema rejette un panier vide', () => {
  const { error } = createOrderSchema.validate({
    items: [],
    shippingAddress: validAddress,
    paymentMethod: 'PayPal',
    shippingMethod: 'colissimo',
  });
  assert.ok(error);
});

test('createOrderSchema accepte une commande valide', () => {
  const { error } = createOrderSchema.validate({
    items: [{ productId: '507f1f77bcf86cd799439011', quantity: 2, price: 10 }],
    shippingAddress: validAddress,
    paymentMethod: 'Carte bancaire',
    shippingMethod: 'chronopost',
  });
  assert.equal(error, undefined);
});

test('updateStockSchema rejette un stock négatif', () => {
  const { error } = updateStockSchema.validate({ stock: -1 });
  assert.ok(error);
});
