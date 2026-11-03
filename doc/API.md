# Documentation de l'API

> Fichier **généré automatiquement** par `npm run docs` (`scripts/generate-docs.js`).
> Ne pas modifier à la main : régénérer après tout changement de routes.

| Méthode | Chemin | Middlewares |
|---------|--------|-------------|
| POST | `/api/auth/login` | validate(loginSchema), login |
| POST | `/api/auth/register` | validate(registerSchema), register |
| POST | `/api/auth/logout` | logout |
| GET | `/api/orders` | authenticateToken, isAdmin, getOrders |
| POST | `/api/orders` | authenticateToken, validate(createOrderSchema), createOrder |
| DELETE | `/api/orders/:id` | authenticateToken, isAdmin, deleteOrder |
| PUT | `/api/orders/:id/validate` | authenticateToken, isAdmin, validateOrder |
| PUT | `/api/orders/:orderId/status` | authenticateToken, isAdmin, updateOrderStatus |
| GET | `/api/products` | getProducts |
| PUT | `/api/products/:productId/stock` | authenticateToken, isAdmin, validate(updateStockSchema), updateProductStock |

_Généré le 2026-11-03T10:37:07.474Z_
