// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Instance partagée : withCredentials envoie/stocke le cookie d'authentification HTTPOnly.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const fetchProducts = () => api.get('/products');

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (data) => api.post('/auth/register', data);
export const logout = () => api.post('/auth/logout');

export const createOrder = (orderData) => api.post('/orders', orderData);

export default api;
