// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // L'authentification repose sur le cookie HTTPOnly côté API ;
  // côté client on se base sur l'utilisateur mémorisé (non sensible).
  const isAuthenticated = !!localStorage.getItem('username');
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
