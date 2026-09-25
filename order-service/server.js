require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
const port = process.env.ORDER_SERVICE_PORT || process.env.PORT || 3003;

// ─── Service URLs (configurable via environment variables) ────────────────────
const USER_SERVICE_URL    = process.env.USER_SERVICE_URL    || 'http://user-service:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Root Health Endpoint ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'CampusConnect Order Microservice',
    version: '1.0.0',
    status: 'running',
    dependencies: {
      userService:    USER_SERVICE_URL,
      productService: PRODUCT_SERVICE_URL
    },
    endpoints: {
      getAllOrders:  'GET  /orders',
      getOrderById: 'GET  /orders/:id',
      createOrder:  'POST /orders'
    }
  });
});

// ─── Mongoose Order Schema & Model ────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    userId:     { type: String, required: [true, 'userId is required'] },
    productId:  { type: String, required: [true, 'productId is required'] },
    quantity:   { type: Number, required: [true, 'quantity is required'], min: [1, 'quantity must be at least 1'] },
    totalPrice: { type: Number, default: 0 },
    status:     { type: String, default: 'placed', enum: ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
    // Enriched data stored at order creation time
    userName:    { type: String, default: '' },
    userEmail:   { type: String, default: '' },
    productName: { type: String, default: '' },
    productPrice:{ type: Number, default: 0 }
  },
  { versionKey: false, timestamps: true }
);

orderSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const Order = mongoose.model('Order', orderSchema);

// ─── Validation Helper ────────────────────────────────────────────────────────
function validateOrder(body) {
  if (!body.userId || typeof body.userId !== 'string' || body.userId.trim() === '') {
    return { valid: false, error: 'userId is required and must be a valid string' };
  }
  if (!body.productId || typeof body.productId !== 'string' || body.productId.trim() === '') {
    return { valid: false, error: 'productId is required and must be a valid string' };
  }
  if (body.quantity === undefined || typeof body.quantity !== 'number' || body.quantity < 1) {
    return { valid: false, error: 'quantity is required and must be at least 1' };
  }
  return { valid: true };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /orders — List all orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// GET /orders/:id — Get one order
app.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${req.params.id} not found` });
    }
    res.status(200).json(order);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Order with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to retrieve order' });
  }
});

// POST /orders — Create a new order (with inter-service communication)
app.post('/orders', async (req, res) => {
  const validation = validateOrder(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { userId, productId, quantity } = req.body;

  // ── Step 1: Validate User exists via User Service ───────────────────────────
  let userData;
  try {
    const userResponse = await axios.get(`${USER_SERVICE_URL}/users/${userId}`, { timeout: 5000 });
    userData = userResponse.data;
  } catch (err) {
    // If User Service responded with 404 → user not found
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: `User with ID ${userId} not found in User Service` });
    }
    // If User Service is unreachable (ECONNREFUSED, timeout, etc.) → 503
    console.error(`❌  User Service unavailable: ${err.message}`);
    return res.status(503).json({
      error: 'User Service is currently unavailable',
      detail: `Could not reach ${USER_SERVICE_URL}/users/${userId}`
    });
  }

  // ── Step 2: Validate Product exists via Product Service ─────────────────────
  let productData;
  try {
    const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/products/${productId}`, { timeout: 5000 });
    productData = productResponse.data;
  } catch (err) {
    // If Product Service responded with 404 → product not found
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: `Product with ID ${productId} not found in Product Service` });
    }
    // If Product Service is unreachable → 503
    console.error(`❌  Product Service unavailable: ${err.message}`);
    return res.status(503).json({
      error: 'Product Service is currently unavailable',
      detail: `Could not reach ${PRODUCT_SERVICE_URL}/products/${productId}`
    });
  }

  // ── Step 3: Calculate total price and create the order ──────────────────────
  try {
    const totalPrice = productData.price * quantity;

    const newOrder = new Order({
      userId,
      productId,
      quantity,
      totalPrice,
      status: 'placed',
      userName:     userData.name || '',
      userEmail:    userData.email || '',
      productName:  productData.name || '',
      productPrice: productData.price || 0
    });

    const saved = await newOrder.save();

    console.log(`✅  Order created: ${saved.id} | User: ${userData.name} | Product: ${productData.name} | Qty: ${quantity} | Total: ₹${totalPrice}`);

    res.status(201).json(saved);
  } catch (err) {
    console.error('❌  Failed to create order:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ─── Connect to MongoDB, then start server ────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/campusconnect-orders';

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`✅  Order Service connected to MongoDB (${mongoUri})`);
    console.log(`📡  User Service URL:    ${USER_SERVICE_URL}`);
    console.log(`📡  Product Service URL: ${PRODUCT_SERVICE_URL}`);
    app.listen(port, () => {
      console.log(`🚀  Order Service running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
