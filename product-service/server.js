require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PRODUCT_SERVICE_PORT || process.env.PORT || 3002;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Root Health Endpoint ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'CampusConnect Product Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      getAllProducts:    'GET    /products',
      getProductById:   'GET    /products/:id',
      createProduct:    'POST   /products',
      updateProduct:    'PUT    /products/:id',
      deleteProduct:    'DELETE /products/:id'
    }
  });
});

// ─── Mongoose Product Schema & Model ──────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: [true, 'product name is required'], trim: true },
    description: { type: String, trim: true, default: '' },
    price:       { type: Number, required: [true, 'price is required'], min: [0, 'price must be non-negative'] },
    category:    { type: String, trim: true, default: 'general' },
    stock:       { type: Number, default: 0, min: [0, 'stock cannot be negative'] }
  },
  { versionKey: false, timestamps: true }
);

productSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const Product = mongoose.model('Product', productSchema);

// ─── Validation Helper ────────────────────────────────────────────────────────
function validateProduct(body) {
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return { valid: false, error: 'product name is required and must be a valid string' };
  }
  if (body.price === undefined || typeof body.price !== 'number' || body.price < 0) {
    return { valid: false, error: 'price is required and must be a non-negative number' };
  }
  return { valid: true };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /products — List all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// GET /products/:id — Get one product
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: `Product with ID ${req.params.id} not found` });
    }
    res.status(200).json(product);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Product with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to retrieve product' });
  }
});

// POST /products — Create a new product
app.post('/products', async (req, res) => {
  const validation = validateProduct(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const newProduct = new Product({
      name:        req.body.name.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      price:       req.body.price,
      category:    req.body.category ? req.body.category.trim() : 'general',
      stock:       req.body.stock !== undefined ? req.body.stock : 0
    });
    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /products/:id — Full update
app.put('/products/:id', async (req, res) => {
  const validation = validateProduct(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name:        req.body.name.trim(),
        description: req.body.description ? req.body.description.trim() : '',
        price:       req.body.price,
        category:    req.body.category ? req.body.category.trim() : 'general',
        stock:       req.body.stock !== undefined ? req.body.stock : 0
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: `Product with ID ${req.params.id} not found` });
    }
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Product with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /products/:id — Delete a product
app.delete('/products/:id', async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: `Product with ID ${req.params.id} not found` });
    }
    res.status(200).json({ message: `Product with ID ${req.params.id} deleted successfully` });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Product with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ─── Connect to MongoDB, then start server ────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/campusconnect-products';

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`✅  Product Service connected to MongoDB (${mongoUri})`);
    app.listen(port, () => {
      console.log(`🚀  Product Service running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
