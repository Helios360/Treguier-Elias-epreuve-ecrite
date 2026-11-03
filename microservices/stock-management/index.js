// microservices/stock-management/index.js
// Service décentralisé de gestion du stock : il est le seul à écrire le stock.
const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const PORT = process.env.STOCK_PORT || 4003;
const MONGO_URI = process.env.MONGO_URI;

// Modèle Product (schéma local au service ; collection partagée "products")
const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    description: String,
    stock: Number,
  },
  { timestamps: true, collection: 'products' }
);
const Product = mongoose.model('Product', productSchema);

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('stock-management : MongoDB connecté'))
  .catch((err) => console.error('stock-management : erreur MongoDB', err.message));

// Décrémente le stock d'un ou plusieurs produits.
// Accepte { productId, quantity } ou { items: [{ productId, quantity }] }.
app.post('/update-stock', async (req, res) => {
  const { productId, quantity, items } = req.body;
  const list = Array.isArray(items) ? items : [{ productId, quantity }];

  try {
    const results = [];
    for (const item of list) {
      const product = await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -Math.abs(item.quantity || 0) } },
        { new: true }
      );
      results.push(
        product
          ? { productId: item.productId, stock: product.stock }
          : { productId: item.productId, error: 'Produit non trouvé' }
      );
    }
    res.json({ message: 'Stock mis à jour', results });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du stock', error: error.message });
  }
});

// Consultation du stock d'un produit
app.get('/stock/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select('name stock');
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

app.listen(PORT, () => console.log(`Service de gestion des stocks sur le port ${PORT}`));
