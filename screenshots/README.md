# Lab 7 Screenshot Evidence Index

Save all required Lab 7 submission screenshots in this folder using the naming convention below.

---

## Lab 7 — API Gateway, Service Discovery & Cloud Deployment

| # | Filename | Description |
|---|----------|-------------|
| **L7-01** | `L7-01_compose_up.png` | `docker compose up -d --build` — all 4 services (gateway + 3 microservices) starting |
| **L7-02** | `L7-02_compose_ps.png` | `docker compose ps` — showing api-gateway, user-service, product-service, order-service all Up |
| **L7-03** | `L7-03_gateway_health.png` | Postman: `GET http://localhost:8080/health` → 200 OK with gateway metadata |
| **L7-04** | `L7-04_gateway_get_users.png` | Postman: `GET http://localhost:8080/users` → 200 OK (proxied to user-service) |
| **L7-05** | `L7-05_gateway_post_user.png` | Postman: `POST http://localhost:8080/users` → 201 Created |
| **L7-06** | `L7-06_gateway_get_products.png` | Postman: `GET http://localhost:8080/products` → 200 OK (proxied to product-service) |
| **L7-07** | `L7-07_gateway_post_product.png` | Postman: `POST http://localhost:8080/products` → 201 Created |
| **L7-08** | `L7-08_gateway_post_order.png` | Postman: `POST http://localhost:8080/orders` → 201 Created (inter-service flow via gateway) |
| **L7-09** | `L7-09_gateway_get_orders.png` | Postman: `GET http://localhost:8080/orders` → 200 OK |
| **L7-10** | `L7-10_503_test.png` | Postman: Gateway 503 response after `docker stop user-service` |
| **L7-11** | `L7-11_recovery_test.png` | Postman: 200 OK after `docker start user-service` (recovery) |
| **L7-12** | `L7-12_gateway_logs.png` | `docker compose logs api-gateway` — showing morgan request log lines |
| **L7-13** | `L7-13_compose_yaml.png` | IDE/editor view of `compose.yaml` — gateway added, microservice ports removed |
| **L7-14** | `L7-14_service_registry.png` | IDE/editor view of `api-gateway/service-registry.js` — env-var based config |
| **L7-15** | `L7-15_render_dashboard.png` | Render deployment dashboard — showing all 4 services deployed |
| **L7-16** | `L7-16_cloud_health.png` | Postman: `GET https://campusconnect-gateway.onrender.com/health` → 200 OK |
| **L7-17** | `L7-17_cloud_users.png` | Postman: `GET https://campusconnect-gateway.onrender.com/users` → 200 OK |
| **L7-18** | `L7-18_cloud_orders.png` | Postman: `POST https://campusconnect-gateway.onrender.com/orders` → 201 Created |

---

## How to Capture Screenshots

### Local Testing (L7-01 through L7-14)

```powershell
# 1. Build and start all services
docker compose up -d --build

# 2. Capture docker compose ps
docker compose ps

# 3. Open Postman, import API_Gateway_Lab_7.postman_collection.json
#    Set gatewayUrl = http://localhost:8080
#    Run each request and screenshot the result

# 4. 503 Test:
docker stop user-service
# → Postman: GET http://localhost:8080/users → should return 503

# 5. Recovery:
docker start user-service
# → Postman: GET http://localhost:8080/users → should return 200

# 6. View gateway logs:
docker compose logs api-gateway
```

### Cloud Testing (L7-15 through L7-18)

```
1. Deploy to Render (see README.md Step 9)
2. In Postman, change gatewayUrl to your Render public URL
3. Re-run collection and screenshot results
```

---

*Lab 7 — CampusConnect API Gateway, Service Discovery & Cloud Deployment*  
*Student ID: 202512053*
