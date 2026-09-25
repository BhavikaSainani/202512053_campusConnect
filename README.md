# CampusConnect — Lab 7: API Gateway, Service Discovery & Cloud Deployment

**Course:** Web Services and Service-Oriented Architecture (SOA) Laboratory  
**Student ID:** 202512053  
**Tech Stack:** Docker | Docker Compose | Express.js (Node.js 20) | MongoDB Atlas | http-proxy-middleware | Postman | Render (Cloud)

---

## Table of Contents
1. [Project Overview & Lab Evolution](#1-project-overview--lab-evolution)
2. [Why an API Gateway?](#2-why-an-api-gateway)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Gateway Endpoints & Routing Table](#4-gateway-endpoints--routing-table)
5. [Service Discovery — Config-Based Approach](#5-service-discovery--config-based-approach)
6. [Step-by-Step Implementation](#6-step-by-step-implementation)
   - [Step 1: Confirm Lab 6 services work](#step-1--confirm-lab-6-services-work)
   - [Step 2: Design routing table](#step-2--design-routing-table)
   - [Step 3: Scaffold api-gateway service](#step-3--scaffold-api-gateway-service)
   - [Step 4: Externalise service URLs into env vars](#step-4--externalise-service-urls-into-env-vars)
   - [Step 5: Implement reverse-proxy routes](#step-5--implement-reverse-proxy-routes)
   - [Step 6: Add /health, request logging & 502/503 error handling](#step-6--add-health-request-logging--502503-error-handling)
   - [Step 7: Add gateway to docker-compose.yml](#step-7--add-gateway-to-docker-composeyml)
   - [Step 8: Local Postman Testing](#step-8--local-postman-testing)
   - [Step 9: Cloud Deployment on Render](#step-9--cloud-deployment-on-render)
   - [Step 10: Test against Public Gateway URL](#step-10--test-against-public-gateway-url)
   - [Step 11: README update](#step-11--readme-update)
7. [Static vs Dynamic Service Discovery](#7-static-vs-dynamic-service-discovery)
8. [What Changed from Lab 6](#8-what-changed-from-lab-6)
9. [Submission Checklist](#9-submission-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Lab 6 Documentation (preserved)](#11-lab-6-documentation-preserved)

---

## 1. Project Overview & Lab Evolution

| Lab | Focus | What Was Built |
|-----|-------|----------------|
| **Lab 3** | RESTful Web Services | Express.js Student API with in-memory data |
| **Lab 4** | Multi-client Architecture | REST API + React web client + Android mobile client + MongoDB Atlas |
| **Lab 5** | Docker & Containerization | Dockerized monolithic Student API + MongoDB container + Docker Compose |
| **Lab 6** | Microservices | Decomposed backend into 3 independent services with inter-service communication |
| **Lab 7** | **API Gateway + Service Discovery + Cloud** | **Single gateway entry point, config-based service discovery, cloud deployment** |

In **Lab 7**, clients no longer call each microservice directly. Instead:
- An **API Gateway** acts as the **single entry point** for all client requests.
- The gateway **reverse-proxies** requests to the correct backend service.
- Service URLs are **externalized into environment variables** (service discovery layer).
- The entire system is **deployed to the cloud** (Render) and accessible over the internet.

---

## 2. Why an API Gateway?

> **Discussion Question:** *Why introduce an API Gateway instead of letting clients call each service directly?*

### The Problem with Direct Client-to-Service Calls (Lab 6)

In Lab 6, the client (Postman) called each microservice directly:
- `localhost:3001` → User Service
- `localhost:3002` → Product Service
- `localhost:3003` → Order Service

This creates several problems:

| Problem | Description |
|---------|-------------|
| **Tight coupling** | Every client must know the address of every service. If a service moves, all clients break. |
| **No cross-cutting concerns** | Logging, authentication, rate-limiting, and CORS must be implemented identically in every service. |
| **Security exposure** | Every service is publicly reachable — attackers have a larger attack surface. |
| **Port sprawl** | Clients must manage multiple ports/addresses. Mobile and browser clients struggle with this. |
| **No error unification** | Each service returns errors in its own format. |

### How the API Gateway Solves This

```
WITHOUT GATEWAY (Lab 6):      WITH GATEWAY (Lab 7):
Client → :3001 User           Client → :8080 API Gateway → :3001 User
Client → :3002 Product                                   → :3002 Product
Client → :3003 Order                                     → :3003 Order
```

| Benefit | Gateway Approach |
|---------|-----------------|
| **Single entry point** | Clients only know one address |
| **Cross-cutting concerns** | Logging, error handling, CORS in one place |
| **Reduced attack surface** | Only gateway port (8080) is public; services are internal |
| **Internal structure hidden** | Clients don't know how many services exist or their addresses |
| **Centralized logging** | Every request is logged in one place (morgan middleware) |
| **Unified 502/503 handling** | Gateway catches all unreachable-service errors cleanly |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERNET / PUBLIC                                  │
│                                                                             │
│          Client / Postman                                                   │
│               │                                                             │
│               │  HTTP requests to single public address                    │
│               │  Local:  http://localhost:8080                             │
│               │  Cloud:  https://campusconnect-gateway.onrender.com        │
│               │                                                             │
└───────────────┼─────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOCKER ENGINE / DOCKER COMPOSE                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │             Docker Network: campus-network (Bridge)                   │  │
│  │                                                                       │  │
│  │   ┌────────────────────────────────────────┐                          │  │
│  │   │  Container: api-gateway                │◄── Port 8080 (PUBLIC)   │  │
│  │   │  Port exposed: 8080:8080               │                          │  │
│  │   │  Routes:                               │                          │  │
│  │   │    /users    → user-service:3001       │                          │  │
│  │   │    /products → product-service:3002    │                          │  │
│  │   │    /orders   → order-service:3003      │                          │  │
│  │   │    /health   → self (no proxy)         │                          │  │
│  │   │  Features: morgan logging, 502/503     │                          │  │
│  │   └─────────┬──────────┬───────────────────┘                          │  │
│  │             │          │           │                                   │  │
│  │   (internal │Docker DNS│routing)   │                                   │  │
│  │             ▼          ▼           ▼                                   │  │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │  │
│  │   │ user-service │  │product-svc   │  │ order-service│               │  │
│  │   │ Port: 3001   │  │ Port: 3002   │  │ Port: 3003   │               │  │
│  │   │ (NO host     │  │ (NO host     │  │ (NO host     │               │  │
│  │   │  port bind)  │  │  port bind)  │  │  port bind)  │               │  │
│  │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │  │
│  │          │                 │                  │                        │  │
│  │          └─────────────────┼──────────────────┘                       │  │
│  │                            ▼                                           │  │
│  │                 ┌──────────────────┐                                   │  │
│  │                 │    mongodb       │  ← No host port exposed           │  │
│  │                 │ (internal only)  │                                   │  │
│  │                 └──────────────────┘                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

Layer Architecture:
  Client / Postman  →  [Internet]  →  API Gateway (public)
  API Gateway       →  [Docker Network]  →  User / Product / Order Services
  Services          →  [MongoDB Atlas connection string]  →  MongoDB Atlas
```

**Key Points:**
- **Only port 8080** (gateway) is exposed to the host/internet in Lab 7.
- Microservices are **Docker-network-only** — they cannot be reached directly from outside.
- MongoDB is accessed by services via **MongoDB Atlas connection string** (cloud-hosted since Lab 4).
- The gateway layer is where **all logging, error handling, and routing** live.

---

## 4. Gateway Endpoints & Routing Table

| Gateway Path | Routed To | Example |
|--------------|-----------|---------|
| `GET /users` | User Service | `GET /users` → user-service:3001/users |
| `GET /users/:id` | User Service | `GET /users/101` → user-service:3001/users/101 |
| `POST /users` | User Service | `POST /users` with body |
| `PUT /users/:id` | User Service | `PUT /users/101` |
| `DELETE /users/:id` | User Service | `DELETE /users/101` |
| `GET /products` | Product Service | `GET /products` → product-service:3002/products |
| `GET /products/:id` | Product Service | `GET /products/501` |
| `POST /products` | Product Service | `POST /products` with body |
| `PUT /products/:id` | Product Service | `PUT /products/501` |
| `DELETE /products/:id` | Product Service | `DELETE /products/501` |
| `POST /orders` | Order Service | `POST /orders` with body |
| `GET /orders` | Order Service | `GET /orders` |
| `GET /orders/:id` | Order Service | `GET /orders/789` |
| **`GET /health`** | **Gateway itself** | **Health check — no proxying** |

---

## 5. Service Discovery — Config-Based Approach

### What is Service Discovery?

Service discovery is the mechanism by which one component finds the network address of another. In a microservices system, service addresses can change (new containers, scaling, cloud redeployment), so **service discovery decouples the gateway from hard-coded addresses**.

### Our Approach: Static / Config-Based Service Discovery

The gateway reads all service URLs from **environment variables** at startup. No service URL appears as a literal string in routing code.

```javascript
// service-registry.js — service URLs from env vars, never hard-coded
const serviceRegistry = {
  userService:    { url: process.env.USER_SERVICE_URL    || 'http://user-service:3001' },
  productService: { url: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002' },
  orderService:   { url: process.env.ORDER_SERVICE_URL   || 'http://order-service:3003' }
};
```

```yaml
# compose.yaml — service URLs injected as environment variables
api-gateway:
  environment:
    USER_SERVICE_URL:    http://user-service:3001
    PRODUCT_SERVICE_URL: http://product-service:3002
    ORDER_SERVICE_URL:   http://order-service:3003
```

**To change a service's address:** update the environment variable and restart the gateway. No code change, no rebuild required.

### Proving Config Works Without Code Change

**Test:** Change `USER_SERVICE_URL` in `compose.yaml` to point to a different port/address, run `docker compose up -d`, and the gateway routes to the new address — **zero code changes**.

---

## 6. Step-by-Step Implementation

### Step 1 — Confirm Lab 6 services work

```bash
# Bring up all Lab 6 services
docker compose up -d --build

# Verify all containers are running
docker compose ps

# Quick health checks
curl http://localhost:3001/
curl http://localhost:3002/
curl http://localhost:3003/
```

Expected: All three services respond with their health JSON.

---

### Step 2 — Design routing table

| Path Prefix | Target Service | Internal URL |
|-------------|----------------|--------------|
| `/users` | User Service | `http://user-service:3001` |
| `/products` | Product Service | `http://product-service:3002` |
| `/orders` | Order Service | `http://order-service:3003` |
| `/health` | Gateway itself | — |

---

### Step 3 — Scaffold api-gateway service

```
api-gateway/
├── server.js          # Gateway logic: proxy routes, logging, health, error handling
├── service-registry.js # Service URL config (env-var based service discovery)
├── package.json       # Dependencies: express, http-proxy-middleware, morgan, cors
├── Dockerfile         # Node 20 Alpine — exposes port 8080
└── .dockerignore      # Excludes node_modules, .env, .git
```

**Key dependencies:**

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `http-proxy-middleware` | Reverse proxy to forward requests to target services |
| `morgan` | Request logging middleware |
| `cors` | Cross-Origin Resource Sharing |
| `dotenv` | Load env vars from `.env` in local dev |

---

### Step 4 — Externalise service URLs into env vars

**`api-gateway/service-registry.js`** centralises all service URL definitions. URLs come from environment variables with sensible Docker-network defaults.

No URL is ever written directly in the route-handling code — they always reference the config.

---

### Step 5 — Implement reverse-proxy routes

**`api-gateway/server.js`** uses `http-proxy-middleware`:

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

// Routes read target URLs from service registry (env vars)
app.use('/users',    createProxyMiddleware({ target: USER_SERVICE_URL,    changeOrigin: true }));
app.use('/products', createProxyMiddleware({ target: PRODUCT_SERVICE_URL, changeOrigin: true }));
app.use('/orders',   createProxyMiddleware({ target: ORDER_SERVICE_URL,   changeOrigin: true }));
```

The gateway has **no business logic** — it only routes requests and handles cross-cutting concerns.

---

### Step 6 — Add /health, request logging & 502/503 error handling

**`GET /health`** — gateway self-check:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ service: 'CampusConnect API Gateway', status: 'healthy', ... });
});
```

**Request Logging** via morgan:
```javascript
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
// Example log: GET /users 200 1234 - 12.34 ms
```

**Centralised 502/503 Error Handling:**
```javascript
function onProxyError(err, req, res, target) {
  const status = (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') ? 503 : 502;
  res.status(status).json({
    error:  status === 503 ? 'Service Unavailable' : 'Bad Gateway',
    detail: `The upstream service could not be reached: ${target}`
  });
}
```

If any microservice container is stopped or unreachable, the gateway returns a **clean 502 or 503** instead of crashing or hanging indefinitely.

---

### Step 7 — Add gateway to docker-compose.yml

```yaml
services:
  api-gateway:
    build: ./api-gateway
    container_name: api-gateway
    ports:
      - "8080:8080"          # ← ONLY the gateway is publicly exposed
    environment:
      PORT: 8080
      USER_SERVICE_URL:    http://user-service:3001
      PRODUCT_SERVICE_URL: http://product-service:3002
      ORDER_SERVICE_URL:   http://order-service:3003
    depends_on: [user-service, product-service, order-service]
    networks: [campus-network]

  user-service:
    build: ./user-service
    # NO ports: section — internal only
    environment:
      PORT: 3001
      MONGO_URI: mongodb://mongodb:27017/campusconnect-users
    networks: [campus-network]

  # (product-service and order-service follow the same pattern)
```

**Key change from Lab 6:** `user-service`, `product-service`, `order-service`, and `mongodb` **no longer expose ports to the host**. Only `api-gateway:8080` is reachable from outside.

---

### Step 8 — Local Postman Testing

Import `API_Gateway_Lab_7.postman_collection.json` into Postman.

Set collection variable `gatewayUrl` = `http://localhost:8080`

| # | Test | Method | Gateway Path | Expected |
|---|------|--------|--------------|----------|
| 1 | Gateway health check | `GET` | `/health` | `200 OK` — gateway metadata |
| 2 | Create user via gateway | `POST` | `/users` | `201 Created` |
| 3 | Get all users via gateway | `GET` | `/users` | `200 OK` |
| 4 | Create product via gateway | `POST` | `/products` | `201 Created` |
| 5 | Get all products via gateway | `GET` | `/products` | `200 OK` |
| 6 | Create order via gateway | `POST` | `/orders` | `201 Created` |
| 7 | Get all orders via gateway | `GET` | `/orders` | `200 OK` |
| 8 | Invalid user ID via gateway | `GET` | `/users/000...` | `404 Not Found` |
| 9 | **User service stopped** | `GET` | `/users` | **`503 Service Unavailable`** |
| 10 | **After recovery** | `GET` | `/users` | `200 OK` |

**503 Test Procedure:**
```bash
# 1. Stop user-service
docker stop user-service

# 2. In Postman: GET http://localhost:8080/users → Expect 503

# 3. Restart user-service
docker start user-service

# 4. In Postman: GET http://localhost:8080/users → Expect 200 OK
```

---

### Step 9 — Cloud Deployment on Render

**Platform chosen:** [Render](https://render.com) — free tier supports Docker container deployment.

#### Deployment Steps

**1. Push code to GitHub:**
```bash
git add .
git commit -m "Lab 7: API Gateway + Service Discovery"
git push origin main
```

**2. Deploy MongoDB Atlas** (already cloud-hosted since Lab 4):
- Connection strings for each service are stored as environment variables on Render.

**3. Deploy each service on Render (Web Service — Docker):**

| Service | Root Directory | Port | Environment Variables |
|---------|---------------|------|-----------------------|
| `user-service` | `./user-service` | 3001 | `PORT=3001`, `MONGO_URI=<Atlas URI>` |
| `product-service` | `./product-service` | 3002 | `PORT=3002`, `MONGO_URI=<Atlas URI>` |
| `order-service` | `./order-service` | 3003 | `PORT=3003`, `MONGO_URI=<Atlas URI>`, `USER_SERVICE_URL=<user-svc URL>`, `PRODUCT_SERVICE_URL=<product-svc URL>` |
| `api-gateway` | `./api-gateway` | 8080 | `PORT=8080`, `USER_SERVICE_URL=<user-svc URL>`, `PRODUCT_SERVICE_URL=<product-svc URL>`, `ORDER_SERVICE_URL=<order-svc URL>` |

**4. Configure gateway environment variables** with the public Render URLs of each service (e.g. `https://campusconnect-user.onrender.com`). No code change required — only env var updates.

**5. Test public gateway URL:**
```
https://campusconnect-gateway.onrender.com/health
https://campusconnect-gateway.onrender.com/users
https://campusconnect-gateway.onrender.com/products
https://campusconnect-gateway.onrender.com/orders
```

#### Render Deployment Notes
- Render's free tier may spin down inactive services after 15 minutes — the first request after inactivity takes ~30s to cold-start.
- Set `restart: always` equivalent in Render's service settings.
- All environment variables must be set in Render's environment settings (not in source code).
- MongoDB Atlas must whitelist Render's IP range (`0.0.0.0/0` for simplicity on free tier).

---

### Step 10 — Test against Public Gateway URL

In Postman, change collection variable:
```
gatewayUrl = https://campusconnect-gateway.onrender.com
```

Re-run the same Postman collection. All requests should work identically to local testing.

**Full flow verified:** `Postman → Render (API Gateway) → Render (Microservices) → MongoDB Atlas`

---

### Step 11 — README update

This document serves as the updated README for Lab 7. It includes:
- Updated architecture diagram showing the gateway layer
- Service discovery approach discussion
- Step-by-step implementation
- Cloud deployment steps and troubleshooting notes
- Static vs dynamic service discovery comparison

---

## 7. Static vs Dynamic Service Discovery

| Aspect | Static / Config-Based (Our Approach) | Dynamic (e.g., Consul, K8s DNS, Eureka) |
|--------|--------------------------------------|------------------------------------------|
| **How URLs are resolved** | Read from env vars / config file at startup | Services self-register; registry updated at runtime |
| **Code change needed to update URL** | No — just update env var and restart | No — registry auto-updates |
| **Supports auto-scaling** | ❌ Manual config update needed per instance | ✅ New instances register automatically |
| **Complexity** | Low — a `.env` file or compose env section | High — needs a service registry server (Consul, etcd, etc.) |
| **Failure detection** | ❌ No automatic health checks in registry | ✅ Registry removes unhealthy instances |
| **Best for** | Small, known set of services (lab, startup) | Large, dynamic, auto-scaling systems |
| **Our lab justification** | Sufficient for 3 fixed services | Would add unnecessary complexity for 3 services |

**Conclusion:** Static config-based service discovery is the **lightweight, practical form** of service discovery. It gives us the key benefit (no hard-coded URLs in routing code) without the operational overhead of a dynamic registry server. For production systems with auto-scaling, dynamic discovery (Kubernetes DNS, Consul) would be preferred.

---

## 8. What Changed from Lab 6

> *A short reflection on how the gateway and cloud deployment changed how the system is used and operated.*

In **Lab 6**, the system was a collection of three independently accessible microservices. A client (Postman) needed to know the individual addresses and ports of three separate services. This was manageable in a local Docker environment but impractical for real clients — especially mobile apps or browsers — which would need to track multiple endpoints.

In **Lab 7**, the introduction of the API Gateway fundamentally changed the operational model:

1. **Single address, single port.** Clients now interact with one URL (`http://localhost:8080` locally, or the cloud URL). The internal structure of the system — how many services exist, what ports they run on — is completely hidden from clients.

2. **Reduced attack surface.** In Lab 6, three ports were exposed to the host. In Lab 7, only port 8080 is public. The microservices are isolated on the Docker bridge network and cannot be reached directly from outside.

3. **Cross-cutting concerns are centralized.** Logging (every request produces a structured log line via morgan), CORS, and 502/503 error handling now live in one place instead of being replicated across three services.

4. **Service addresses became configuration.** No URL is ever embedded in code. Changing where a service runs requires only an environment variable update — this is the essence of service discovery and makes cloud redeployment straightforward.

5. **Cloud reachability.** Lab 6 ran only on localhost. Lab 7 deployed the containerized system to Render, making it reachable over the internet from any device via the public gateway URL.

The result is a more professional, production-like architecture where the internal complexity is hidden, operations are centralized, and the system is accessible globally.

---

## 9. Submission Checklist

### API Gateway ✅

| Item | Status | Evidence |
|------|--------|----------|
| `api-gateway/` service created | ✅ | `api-gateway/server.js`, `package.json`, `Dockerfile` |
| Routes to `/users`, `/products`, `/orders` | ✅ | `server.js` — proxy middleware |
| `GET /health` implemented | ✅ | Returns 200 with gateway metadata |
| Request logging added | ✅ | `morgan` middleware in `server.js` |
| 502/503 on unreachable service | ✅ | `onProxyError` function in `server.js` |

### Service Discovery ✅

| Item | Status | Evidence |
|------|--------|----------|
| Service URLs in env vars/config | ✅ | `service-registry.js` + `compose.yaml` env section |
| No hard-coded URLs in route code | ✅ | Routes reference variables, not literals |
| Config change proven without code change | ✅ | Section 6, Step 4 |
| Static vs dynamic discussed in README | ✅ | Section 7 of this README |

### Cloud Deployment ✅

| Item | Status | Evidence |
|------|--------|----------|
| Cloud platform chosen | ✅ | Render |
| Gateway + services deployed | ✅ | Render dashboard screenshots |
| Env vars set for cloud | ✅ | No hard-coded cloud values in source |
| Public gateway URL reachable | ✅ | `https://campusconnect-gateway.onrender.com/health` |
| Postman re-tested against public URL | ✅ | Screenshots in `screenshots/` |

### Docker Compose ✅

| Item | Status | Evidence |
|------|--------|----------|
| `api-gateway` added to `compose.yaml` | ✅ | `compose.yaml` |
| Only gateway port (8080) exposed | ✅ | Other services have no `ports:` section |

### Postman Collection ✅

| Item | Status | Evidence |
|------|--------|----------|
| Gateway-routed calls to all 3 services | ✅ | `API_Gateway_Lab_7.postman_collection.json` |
| `GET /health` check | ✅ | Section 1 of collection |
| Unreachable-service 502/503 test | ✅ | Section 5 of collection |
| Re-tested against public cloud URL | ✅ | Change `gatewayUrl` variable |

### README ✅

| Item | Status |
|------|--------|
| Architecture diagram with gateway layer | ✅ |
| API Gateway discussion answer | ✅ Section 2 |
| Static vs dynamic service discovery | ✅ Section 7 |
| Deployment steps | ✅ Section 6, Step 9 |
| Troubleshooting notes | ✅ Section 10 |
| Reflection (5-8 lines) on changes from Lab 6 | ✅ Section 8 |

---

## 10. Troubleshooting

| Issue | Root Cause | Resolution |
|-------|-----------|------------|
| `503` on all gateway routes | Microservice container is stopped or unhealthy | `docker compose ps` — restart stopped containers |
| `Cannot GET /health` returns 404 | `/health` route must be declared BEFORE proxy middleware | Verify route order in `server.js` |
| `ECONNREFUSED` on gateway startup | Services not yet ready when gateway starts | `depends_on` in compose; gateway retries are handled by `restart: unless-stopped` |
| Gateway returns 502 instead of service's 404 | Proxy error vs proxied error are different | 502 = gateway can't reach service; 404 = service responded with not-found (these pass through) |
| Cloud: MongoDB connection timeout | Atlas IP whitelist doesn't include cloud provider IPs | Whitelist `0.0.0.0/0` in Atlas Network Access (free tier) |
| Cloud: First request very slow | Render free tier spins down after 15min inactivity | Use paid tier or Render's "keep alive" ping service |
| `http-proxy-middleware` version issue | v3.x has different import/config syntax than v2.x | Use `createProxyMiddleware` from `http-proxy-middleware` v3; check `on.error` instead of `onError` |
| Services unreachable inside Docker but gateway running | Services not on same `campus-network` | Verify all services have `networks: [campus-network]` in `compose.yaml` |

---

## 11. Lab 6 Documentation (preserved)

> The full Lab 6 documentation (microservices decomposition, Docker Compose setup, inter-service communication, etc.) is preserved below for reference.

---

### Why Microservices? Monolith vs Microservices

| Aspect | Monolith (Lab 5) | Microservices (Lab 6+) |
|--------|-------------------|------------------------|
| **Codebase** | Single `server.js` with all logic | Separate codebases per service |
| **Deployment** | Deploy entire application | Deploy services independently |
| **Scaling** | Scale entire application | Scale individual services |
| **Database** | Single shared database | Database-per-service isolation |
| **Failure Impact** | Single failure breaks everything | Failures are isolated to one service |

### Service Boundaries

| Service | Responsibility | Port | Database |
|---------|---------------|------|----------|
| **User Service** | Create, retrieve, update, delete users | `:3001` | `campusconnect-users` |
| **Product Service** | Manage product catalog | `:3002` | `campusconnect-products` |
| **Order Service** | Create & retrieve orders; validate via User & Product APIs | `:3003` | `campusconnect-orders` |
| **API Gateway** (Lab 7) | Single public entry point; reverse proxy; logging; error handling | `:8080` | — |

### Docker Commands Reference

| Command | Purpose |
|---------|---------|
| `docker compose up -d --build` | Build images and start all services in background |
| `docker compose ps` | Show status of all services |
| `docker compose logs -f` | Follow logs from all services |
| `docker compose logs api-gateway` | View gateway logs (with morgan request log) |
| `docker compose down` | Stop and remove containers and networks |
| `docker compose down -v` | Also remove persistent volumes |
| `docker stop user-service` | Stop one service (for 503 test) |
| `docker start user-service` | Restart a stopped service |

---

*End of Lab 7 Documentation — CampusConnect API Gateway, Service Discovery & Cloud Deployment*  
*Student ID: 202512053*