// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { logout } from '../services/api';

const Navbar = () => {
  const navigate = useNavigate();
  const { cart } = useCart();

  const isAuthenticated = !!localStorage.getItem('username');
  const username = localStorage.getItem('username');

  const handleLogout = async () => {
    try {
      await logout(); // supprime le cookie HTTPOnly côté serveur
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <nav className="bg-blue-500 text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-xl font-bold">
          Mon Application
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {isAuthenticated && <span className="font-semibold">Bonjour, {username}</span>}

        <Link to="/cart" className="relative">
          <span>Panier</span>
          {cart.length > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs px-2">
              {cart.length}
            </span>
          )}
        </Link>

        {!isAuthenticated ? (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        ) : (
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">
            Déconnexion
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
