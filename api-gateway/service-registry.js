/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CampusConnect API Gateway — Service Registry (Static / Config-Based)
 * Lab 7: Service Discovery Layer
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This file centralises all service URL definitions.
 * The gateway reads its routing targets from environment variables.
 * If an env var is not set, sensible Docker-network defaults are used.
 *
 * WHY THIS IS "SERVICE DISCOVERY":
 *   Instead of hard-coding service addresses inside route handlers, the gateway
 *   externalises them into this config layer. Operators can change a service's
 *   address by updating an environment variable and restarting the gateway —
 *   no source code change, no rebuild required.
 *
 * STATIC vs DYNAMIC:
 *   This is STATIC (config-based) service discovery. The list of services and
 *   their addresses is fixed at startup. Dynamic discovery (e.g. Consul, K8s
 *   DNS, Eureka) allows services to self-register and de-register at runtime,
 *   enabling auto-scaling. For a lab-scale system, static config is simpler
 *   and sufficient. See README.md §Service Discovery for full comparison.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const serviceRegistry = {
  /**
   * User Service
   * Handles: GET /users, GET /users/:id, POST /users, PUT /users/:id, DELETE /users/:id
   */
  userService: {
    name: 'user-service',
    url:  process.env.USER_SERVICE_URL || 'http://user-service:3001',
    healthPath: '/'
  },

  /**
   * Product Service
   * Handles: GET /products, GET /products/:id, POST /products, PUT /products/:id, DELETE /products/:id
   */
  productService: {
    name: 'product-service',
    url:  process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
    healthPath: '/'
  },

  /**
   * Order Service
   * Handles: POST /orders, GET /orders, GET /orders/:id
   */
  orderService: {
    name: 'order-service',
    url:  process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
    healthPath: '/'
  }
};

module.exports = serviceRegistry;
