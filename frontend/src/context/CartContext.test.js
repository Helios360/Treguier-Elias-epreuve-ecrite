// src/context/CartContext.test.js
import { cartReducer } from './CartContext';

describe('cartReducer', () => {
  test('ADD_TO_CART ajoute un nouveau produit (quantité 1)', () => {
    const state = cartReducer(
      { cart: [] },
      { type: 'ADD_TO_CART', payload: { id: 'p1', name: 'Clavier', price: 100 } }
    );
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(1);
  });

  test('ADD_TO_CART incrémente la quantité d’un produit existant', () => {
    const state = cartReducer(
      { cart: [{ id: 'p1', quantity: 1 }] },
      { type: 'ADD_TO_CART', payload: { id: 'p1' } }
    );
    expect(state.cart[0].quantity).toBe(2);
  });

  test('DECREMENT_QUANTITY ne descend pas sous 1', () => {
    const state = cartReducer(
      { cart: [{ id: 'p1', quantity: 1 }] },
      { type: 'DECREMENT_QUANTITY', payload: { id: 'p1' } }
    );
    expect(state.cart[0].quantity).toBe(1);
  });

  test('REMOVE_FROM_CART retire le produit', () => {
    const state = cartReducer(
      { cart: [{ id: 'p1', quantity: 1 }, { id: 'p2', quantity: 1 }] },
      { type: 'REMOVE_FROM_CART', payload: { id: 'p1' } }
    );
    expect(state.cart.map((i) => i.id)).toEqual(['p2']);
  });

  test('CLEAR_CART vide le panier', () => {
    const state = cartReducer({ cart: [{ id: 'p1', quantity: 3 }] }, { type: 'CLEAR_CART' });
    expect(state.cart).toEqual([]);
  });
});
