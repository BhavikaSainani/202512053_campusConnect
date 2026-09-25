/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CampusConnect — API Gateway
 * Lab 7: API Gateway, Service Discovery & Cloud Deployment
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Responsibilities:
 *  • Single public entry point for all client requests
 *  • Reverse-proxy routing to User, Product, and Order services
 *  • Request logging (morgan)
 *  • Centralised error handling (502/503 for unreachable services)
 *  • GET /health — gateway liveness endpoint
 *
 * Service Discovery (Static / Config-based):
 *  Service URLs are read from environment variables at startup.
 *  Changing a URL requires only a config/env change — NO code change needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const morgan        = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app  = express();
const PORT = process.env.PORT || 8080;

// ─── Service Discovery: URLs from environment variables / config ──────────────
// Changing these requires only an env-var change, never a code change.
const USER_SERVICE_URL    = process.env.USER_SERVICE_URL    || 'http://user-service:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
const ORDER_SERVICE_URL   = process.env.ORDER_SERVICE_URL   || 'http://order-service:3003';

console.log('🔍  Service Discovery Configuration:');
console.log(`     USER_SERVICE_URL    = ${USER_SERVICE_URL}`);
console.log(`     PRODUCT_SERVICE_URL = ${PRODUCT_SERVICE_URL}`);
console.log(`     ORDER_SERVICE_URL   = ${ORDER_SERVICE_URL}`);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());

// Request logging: method, url, status, response-time
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// ─── Health Check ─────────────────────────────────────────────────────────────
// GET /health — gateway itself responds (no proxying)
app.get('/health', (req, res) => {
  res.status(200).json({
    service:  'CampusConnect API Gateway',
    version:  '1.0.0',
    status:   'healthy',
    timestamp: new Date().toISOString(),
    routes: {
      users:    `${USER_SERVICE_URL}/users`,
      products: `${PRODUCT_SERVICE_URL}/products`,
      orders:   `${ORDER_SERVICE_URL}/orders`
    }
  });
});

// ─── Centralised Error Handler for Proxy Errors ───────────────────────────────
/**
 * When a target service is unreachable (ECONNREFUSED, ETIMEDOUT, etc.)
 * http-proxy-middleware emits an 'error' event. We catch it here and
 * return a clean 502/503 instead of letting Node.js crash or hang.
 */
function onProxyError(err, req, res, target) {
  console.error(`❌  Gateway proxy error → ${req.method} ${req.url} | Target: ${target} | ${err.code || err.message}`);

  // Choose status code:
  //   ECONNREFUSED / ENOTFOUND → 503 (service unavailable — container is down)
  //   All other proxy errors    → 502 (bad gateway)
  const status = (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') ? 503 : 502;

  if (!res.headersSent) {
    res.status(status).json({
      error:  status === 503 ? 'Service Unavailable' : 'Bad Gateway',
      detail: `The upstream service could not be reached: ${target}`,
      code:   err.code || 'PROXY_ERROR'
    });
  }
}

// ─── Proxy Options Builder ────────────────────────────────────────────────────
function buildProxy(target, pathFilter, label) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter,
    on: {
      error: (err, req, res) => onProxyError(err, req, res, target)
    },
    logger: {
      info:  (msg) => console.log(`[Gateway → ${label}] ${msg}`),
      warn:  (msg) => console.warn(`[Gateway → ${label}] WARN: ${msg}`),
      error: (msg) => console.error(`[Gateway → ${label}] ERR: ${msg}`)
    }
  });
}

// ─── Routing Table ────────────────────────────────────────────────────────────
//
//  Gateway Path          │ Routed To        │ Example
//  ──────────────────────┼──────────────────┼───────────────────
//  /users, /users/:id    │ User Service     │ GET  /users/101
//  /products, /products/:id│ Product Service│ GET  /products/501
//  /orders, /orders/:id  │ Order Service    │ POST /orders
//  /health               │ Gateway itself   │ Health check
//
app.use(buildProxy(USER_SERVICE_URL, '/users', 'UserService'));
app.use(buildProxy(PRODUCT_SERVICE_URL, '/products', 'ProductService'));
app.use(buildProxy(ORDER_SERVICE_URL, '/orders', 'OrderService'));

// ─── 404 for unmapped routes ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:  'Not Found',
    detail: `No route mapped for ${req.method} ${req.url}`,
    availableRoutes: ['/health', '/users', '/users/:id', '/products', '/products/:id', '/orders', '/orders/:id']
  });
});

// ─── Start Gateway ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  CampusConnect API Gateway running on port ${PORT}`);
  console.log(`     GET  http://localhost:${PORT}/health`);
  console.log(`     GET  http://localhost:${PORT}/users`);
  console.log(`     GET  http://localhost:${PORT}/products`);
  console.log(`     GET  http://localhost:${PORT}/orders\n`);
});
