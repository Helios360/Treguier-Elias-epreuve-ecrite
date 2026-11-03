# Corrections

> Convention : **1 correction = 1 commit = 1 partie**.
>
> Baseline (non comptée comme correction) : `6011025` — import initial du projet
> + `.gitignore` racine + suppression du sous-dépôt git imbriqué `frontend/.git`.

---

## 1. Suppression de la journalisation des secrets et tokens

- **Commit** : `971e4af` — `fix(security): ne plus journaliser les secrets et tokens`
- **Fichiers** : `backend/controllers/authController.js`, `backend/config/db.js`,
  `backend/middlewares/authMiddleware.js`, `microservices/notifications/index.js`
- **Problème** : des données sensibles étaient écrites en clair dans les logs —
  mot de passe utilisateur, token JWT, URI MongoDB (identifiants) et mot de passe
  d'application email.
- **Correction** : retrait de tous les logs exposant des secrets ; remplacés par des
  messages non sensibles (ex. « Tentative de connexion pour: <username> »).
- **Vérification** : `node --check` OK ; revue manuelle, plus aucune valeur sensible journalisée.

---

## 2. Restriction de CORS aux origines autorisées

- **Commit** : `9c1515d` — `fix(security): restreint CORS aux origines autorisées`
- **Fichier** : `backend/server.js`
- **Problème** : `app.use(cors())` acceptait toutes les origines (CORS `*`).
- **Correction** : liste blanche d'origines configurable via `CORS_ORIGIN`
  (séparées par des virgules) ; par défaut `http://localhost:3000`.
- **Vérification** : `node --check` OK ; le comportement par défaut reste inchangé en local.

---

## 3. Implémentation de `deleteOrder` et protection de la route DELETE

- **Commit** : `4187694` — `fix(order): implémente deleteOrder et protège la route DELETE`
- **Fichiers** : `backend/controllers/orderController.js`, `backend/routes/orderRoutes.js`
- **Problème** : `deleteOrder` ne supprimait rien et ne renvoyait aucune réponse
  (requête suspendue) ; la route `DELETE /api/orders/:id` n'exigeait pas le rôle admin.
- **Correction** : suppression réelle via `findByIdAndDelete` avec réponses 404/200/500 ;
  ajout du middleware `isAdmin` conformément au commentaire d'origine.
- **Vérification** : `node --check` OK.

---

## 4. Implémentation de `validateOrder` et correction du statut hors enum

- **Commit** : `6f0fe59` — `fix(order): implémente validateOrder et corrige le statut hors enum`
- **Fichiers** : `backend/controllers/orderController.js`, `backend/controllers/adminController.js`
- **Problème** : `validateOrder` (chemin réellement routé) ne persistait aucun statut et
  lisait `req.body.orderId` alors que la route fournit `:id` ; `adminController` écrivait
  le statut `'Validée'`, absent de l'enum du modèle `Order` → erreur de validation Mongoose.
- **Correction** : `validateOrder` persiste `'En cours de traitement'` (valeur de l'enum) en
  lisant `req.params.id` ; `adminController.validateOrder` aligné sur la même valeur.
- **Vérification** : `node --check` OK ; valeur de statut conforme à l'enum `Order`.

---

## 5. Retrait des logs sensibles front + URL d'API configurable

- **Commit** : `a1e73c4` — `fix(front): retire les logs sensibles et rend l'URL d'API configurable`
- **Fichiers** : `frontend/src/services/api.js`, `frontend/src/services/adminApi.js`
- **Problème** : le token JWT et les données de commande étaient journalisés côté client ;
  l'URL de l'API était codée en dur (`http://localhost:5000/api`).
- **Correction** : suppression des `console.log` sensibles ; URL d'API via
  `process.env.REACT_APP_API_BASE_URL` (défaut localhost inchangé).
- **Vérification** : parsing ESM OK ; comportement local inchangé sans la variable d'env.

---

## Modèle de partie

```
## N. Titre de la correction

- **Commit** : `<sha>` — `<message>`
- **Fichier(s)** : `chemin/du/fichier`
- **Problème** : ...
- **Correction** : ...
- **Vérification** : ...
```
