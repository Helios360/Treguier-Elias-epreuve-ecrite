// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getMessages } from '../services/api';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login(credentials);
      const { role, username } = response.data;

      // Le token est stocké dans un cookie HTTPOnly (inaccessible au JS).
      // On ne conserve côté client que des informations non sensibles pour l'affichage.
      localStorage.setItem('username', username);
      localStorage.setItem('role', role);

      // Affiche le message flash temporaire renvoyé par le backend
      try {
        const { data } = await getMessages();
        const flash = data.messages || {};
        const message = (flash.success && flash.success[0]) || (flash.error && flash.error[0]);
        if (message) alert(message);
      } catch (ignored) {
        /* les messages sont optionnels */
      }

      navigate('/'); // Redirige vers la page d'accueil après la connexion
    } catch (error) {
      if (error.response) {
        alert(error.response.data.message);
      } else {
        console.error('Erreur réseau ou serveur', error);
        alert('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Connexion</h2>
        <input
          type="text"
          placeholder="Nom d'utilisateur"
          value={credentials.username}
          onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={credentials.password}
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 w-full rounded">
          Se connecter
        </button>
      </form>
    </div>
  );
};

export default Login;
