# StadiumOS: Backend Architecture & Design Document
### Enterprise Event-Driven Microservices & Real-Time Orchestration Specification (FIFA World Cup 2026 Edition)
**Author:** Staff Software Architect & Principal Backend Engineer, Google Cloud  
**Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Backend Philosophy

StadiumOS utilizes a **Microservice Architecture** rather than a monolith to meet the performance, scalability, and availability demands of the FIFA World Cup 2026:

*   **Scalability:** Microservices isolate scaling parameters. The *Crowd Service* and *WebSocket Gateway* scale horizontally to handle connection spikes during match ingress and egress, while services like the *Reporting Service* remain lightweight.
*   **Maintainability:** Clean boundaries decouple complex domains (such as ticketing databases, ML inference serving pipelines, and navigation route networks). Development teams can update single service layers without redeploying the entire codebase.
*   **Independent Deployment:** Code updates can be pushed to GKE for specific microservices (e.g., updating vendor menus) without causing downtime for critical safety systems (such as medical dispatches).
*   **Fault Isolation:** If the *Vendor Service* experiences database lock delays due to high concessions checkout traffic, the *Emergency Service* and *Medical Service* continue to process alerts without interruption.

---

## 2. Complete Microservice Architecture

Below are the architectural specifications for the 19 microservices of StadiumOS:

```
  +--------------+    +--------------+    +--------------+    +--------------+
  |    Auth      |    |    User      |    |     Fan      |    |  Volunteer   |
  +--------------+    +--------------+    +--------------+    +--------------+
         |                   |                   |                   |
  +--------------+    +--------------+    +--------------+    +--------------+
  |   Security   |    |   Medical    |    |    Crowd     |    |  Prediction  |
  +--------------+    +--------------+    +--------------+    +--------------+
         |                   |                   |                   |
  +--------------+    +--------------+    +--------------+    +--------------+
  |  Navigation  |    |    Vendor    |    |  Transport   |    | Notification |
  +--------------+    +--------------+    +--------------+    +--------------+
         |                   |                   |                   |
  +--------------+    +--------------+    +--------------+    +--------------+
  |  Analytics   |    |  Emergency   |    |    Report    |    |  AI Gateway  |
  +--------------+    +--------------+    +--------------+    +--------------+
         |                   |                   |                   
  +--------------+    +--------------+    +--------------+    
  |     RAG      |    |  Edge-CV     |    | ML Inference |    
  +--------------+    +--------------+    +--------------+    
```

### Microservice Directory

#### 1. Authentication Service
*   **Responsibilities:** Validates user credentials, issues JWT access/refresh tokens, manages roles, and processes token blacklisting.
*   **Owned Tables:** `users`, `roles`, `permissions`, `user_roles`.
*   **Kafka Topics:** None.
*   **REST APIs:** `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.
*   **Dependencies:** Redis (blacklisting caching).
*   **Scaling Strategy:** CPU-based scaling (scale up when CPU > 75%), running stateless containers.

#### 2. User Service
*   **Responsibilities:** Manages user account profiles and updates contact preferences.
*   **Owned Tables:** `users`, `user_preferences`.
*   **Kafka Topics:** Produces `UserUpdated`.
*   **REST APIs:** `GET /api/v1/users/{id}`, `PUT /api/v1/users/{id}`.
*   **Dependencies:** Authentication Service.
*   **Scaling Strategy:** CPU-based auto-scaling.

#### 3. Fan Service
*   **Responsibilities:** Associates ticket scans with spectator profiles, tracks seat mappings, and manages stadium ingress validation.
*   **Owned Tables:** `fans`, `tickets`.
*   **Kafka Topics:** Produces `TicketValidated`.
*   **REST APIs:** `GET /api/v1/fans/{id}/tickets`, `POST /api/v1/tickets/validate`.
*   **Dependencies:** User Service.
*   **Scaling Strategy:** Thread-level scaling on GKE.

#### 4. Volunteer Service
*   **Responsibilities:** Manages volunteer roster check-ins, tracks active coordinates, and assigns shift tasks.
*   **Owned Tables:** `volunteers`, `shifts`, `volunteer_tasks`.
*   **Kafka Topics:** Consumes `VolunteerRequested`, Produces `VolunteerAssigned`.
*   **REST APIs:** `POST /api/v1/volunteers/checkin`, `POST /api/v1/volunteers/task`.
*   **Dependencies:** User Service, Notification Service.
*   **Scaling Strategy:** Scales horizontally based on WebSocket registration metrics during match events.

#### 5. Security Service
*   **Responsibilities:** Monitors boundary access gates and coordinates on-site guard coordinates.
*   **Owned Tables:** `security_guards`, `patrol_schedules`.
*   **Kafka Topics:** Consumes `SuspiciousObject`, Produces `SecurityAlert`.
*   **REST APIs:** `POST /api/v1/security/dispatch`, `GET /api/v1/security/guards`.
*   **Dependencies:** User Service, Notification Service.
*   **Scaling Strategy:** Redundant multi-zone HA containers.

#### 6. Medical Service
*   **Responsibilities:** Dispatches mobile first-aid squads and tracks on-site clinic bed capacities.
*   **Owned Tables:** `medical_teams`, `clinics`, `medical_cases`.
*   **Kafka Topics:** Consumes `FallDetected`, Produces `MedicalEmergency`.
*   **REST APIs:** `POST /api/v1/medical/dispatch`, `GET /api/v1/medical/clinics`.
*   **Dependencies:** Notification Service, Navigation Service.
*   **Scaling Strategy:** High-availability deployment with node affinity for low-latency nodes.

#### 7. Crowd Service
*   **Responsibilities:** Aggregates real-time crowd densities, flow speeds, and turnstile check-in rates.
*   **Owned Tables:** `crowd_zones`, `entrances`.
*   **Kafka Topics:** Consumes `CrowdDetected`, Produces `GateCongestion`.
*   **REST APIs:** `GET /api/v1/crowd/density`, `GET /api/v1/gates/queues`.
*   **Dependencies:** Redis (for caching live crowd metrics).
*   **Scaling Strategy:** Horizontal auto-scaling driven by Kafka ingestion traffic spikes.

#### 8. Prediction Service
*   **Responsibilities:** Persists and routes ML forecasts for dashboards and agents.
*   **Owned Tables:** `predictions`.
*   **Kafka Topics:** Consumes `CrowdPrediction`, `QueueHigh`, Produces `PredictionAlert`.
*   **REST APIs:** `GET /api/v1/predictions/queues`, `GET /api/v1/predictions/concessions`.
*   **Dependencies:** ML Inference Service, PostgreSQL.
*   **Scaling Strategy:** Memory-optimized GKE node pools.

#### 9. Navigation Service
*   **Responsibilities:** Computes coordinate paths, routing fans and staff around congested zones.
*   **Owned Tables:** `stadium_graphs`, `vertices`, `edges`.
*   **Kafka Topics:** Consumes `NavigationRequest`.
*   **REST APIs:** `POST /api/v1/navigation/route`.
*   **Dependencies:** Crowd Service.
*   **Scaling Strategy:** Runs memory-cached Graph algorithms (Dijkstra) in parallel containers.

#### 10. Vendor Service
*   **Responsibilities:** Tracks concessions transaction volumes, sales velocities, and inventory levels.
*   **Owned Tables:** `vendors`, `food_inventory`, `orders`, `order_items`.
*   **Kafka Topics:** Produces `VendorLowStock`.
*   **REST APIs:** `POST /api/v1/vendors/orders`, `GET /api/v1/vendors/inventory`.
*   **Dependencies:** Postgres, Redis.
*   **Scaling Strategy:** Read replicas route analytical queries away from order processing queues.

#### 11. Transport Service
*   **Responsibilities:** Tracks transport coordinates, matches bus capacities, and checks parking loops.
*   **Owned Tables:** `parking_lots`, `shuttle_buses`, `transit_schedules`.
*   **Kafka Topics:** Consumes `TransportDelay`.
*   **REST APIs:** `GET /api/v1/transit/shuttles`, `GET /api/v1/parking/occupancy`.
*   **Dependencies:** Notification Service.
*   **Scaling Strategy:** Standard auto-scaling.

#### 12. Notification Service
*   **Responsibilities:** Delivers real-time push alerts, SMS notifications, and system notifications.
*   **Owned Tables:** `notifications`.
*   **Kafka Topics:** Consumes `AnnouncementGenerated`.
*   **REST APIs:** `POST /api/v1/notifications/push`, `POST /api/v1/notifications/sms`.
*   **Dependencies:** Firebase Cloud Messaging API, Twilio API.
*   **Scaling Strategy:** High-performance, event-driven Node.js containers running non-blocking I/O.

#### 13. Analytics Service
*   **Responsibilities:** Compiles live event dashboard telemetry logs and transaction analytics.
*   **Owned Tables:** None (reads from read-replicas).
*   **Kafka Topics:** Consumes all event topics.
*   **REST APIs:** `GET /api/v1/analytics/realtime`, `GET /api/v1/analytics/historical`.
*   **Dependencies:** Cloud Bigtable, BigQuery.
*   **Scaling Strategy:** Read-heavy GKE auto-scaling configurations.

#### 14. Emergency Service
*   **Responsibilities:** Dispatches security teams and medical squads, managing emergency escalations.
*   **Owned Tables:** `emergencies`, `incident_logs`.
*   **Kafka Topics:** Consumes `FallDetected`, Produces `EmergencyEvacuation`.
*   **REST APIs:** `POST /api/v1/emergency/escalate`, `POST /api/v1/emergency/clear`.
*   **Dependencies:** Security Service, Medical Service, Notification Service.
*   **Scaling Strategy:** Active-active multi-region GKE configurations with high-priority execution threads.

#### 15. Report Service
*   **Responsibilities:** Generates and archives incident summary PDFs for regulatory compliance.
*   **Owned Tables:** `emergency_reports`.
*   **Kafka Topics:** Consumes `IncidentTriageFinished`.
*   **REST APIs:** `GET /api/v1/reports/{id}`, `POST /api/v1/reports/generate`.
*   **Dependencies:** Object Storage (GCS).
*   **Scaling Strategy:** Async task queue workers run offline rendering engines.

#### 16. AI Gateway Service
*   **Responsibilities:** Acts as the cognitive coordinator, routing prompts to LLM nodes and executing tools.
*   **Owned Tables:** `ai_recommendations`, `feedback`.
*   **Kafka Topics:** Consumes Kafka alerts, Produces `AnnouncementGenerated`.
*   **REST APIs:** `POST /api/v1/copilot/chat`.
*   **Dependencies:** Vertex AI LLM, RAG Service.
*   **Scaling Strategy:** Scales dynamically using custom metrics for active LangGraph threads.

#### 17. RAG Service
*   **Responsibilities:** Ingests maps, handbooks, and schedules, converting them into vector search indexes.
*   **Owned Tables:** None (indexes Vertex AI Vector Search).
*   **Kafka Topics:** None.
*   **REST APIs:** `POST /api/v1/rag/query`, `POST /api/v1/rag/documents`.
*   **Dependencies:** Vertex AI Vector Search.
*   **Scaling Strategy:** Fast memory node arrays optimized for vector indexing operations.

#### 18. Computer Vision Service (Edge-CV Interface)
*   **Responsibilities:** Receives anonymized metadata from edge cameras and writes streams to Kafka.
*   **Owned Tables:** None.
*   **Kafka Topics:** Produces `CrowdDetected`, `QueueHigh`, `FallDetected`, `SuspiciousObject`.
*   **REST APIs:** `POST /api/v1/edge/telemetry` (backup path).
*   **Dependencies:** Edge hardware pipelines.
*   **Scaling Strategy:** Highly scalable API entry endpoints backed by Kafka brokers.

#### 19. ML Inference Service
*   **Responsibilities:** Hosts custom ML models on Vertex AI, serving predictions to downstream agents.
*   **Owned Tables:** None.
*   **Kafka Topics:** Consumes telemetry logs, Produces `CrowdPrediction`.
*   **REST APIs:** `POST /api/v1/predict/wait-times`.
*   **Dependencies:** PostgreSQL, Vertex AI Feature Store.
*   **Scaling Strategy:** GPU-enabled GKE autoscaling node pools.

---

## 3. API Gateway Design

The API Gateway is the central ingress coordinator for all client traffic, built using Apigee or an Envoy Proxy.

```
[Clients] -> [API Gateway: Rate Limiting & Auth Checks] -> [Envoy Routing Path] -> [Microservices]
```

*   **Authentication Validation:**
    *   Intercepts incoming tokens. Validates the JWT cryptographically against the Auth Service public key registry.
    *   Checks the Redis blacklist cache to ensure the token has not been revoked.
*   **Dynamic Routing:**
    *   Routes paths based on prefixes: `/api/v1/crowd/*` redirects to the Crowd Service, while `/api/v1/auth/*` routes to the Authentication Service.
*   **Rate Limiting:**
    *   Implements token-bucket rate limiting based on client IP and authorization scopes:
        *   `role:fan` limit: 60 requests/minute.
        *   `role:staff` limit: 300 requests/minute.
*   **Logging & Tracing:**
    *   Injects a unique `X-Correlation-ID` header into every request. Downstream microservices pass this correlation ID to trace performance across distributed systems.
*   **API Versioning:**
    *   Strict version control enforced in URLs (e.g., `/api/v1/...`, `/api/v2/...`), preventing breaking changes from disrupting legacy client builds.

---

## 4. REST API Design Specification

### 1. Crowd Service APIs
#### Endpoint: `GET /api/v1/crowd/density`
*   **Request:**
    ```
    Headers: Authorization: Bearer <JWT>
    Params: zone_id=ZONE_42 (string, required), metric_window_mins=15 (int, optional)
    ```
*   **Response:**
    *   *Status Code:* 200 OK
    *   *Payload:*
        ```json
        {
          "zone_id": "ZONE_42",
          "current_density_sqm": 2.8,
          "alert_status": "AMBER",
          "head_count": 420,
          "timestamp": "2026-07-07T03:55:00Z"
        }
        ```
*   **Error Response:**
    *   *Status Code:* 404 Not Found
    *   *Payload:* `{ "error_code": "ZONE_NOT_FOUND", "message": "Zone with ID ZONE_42 does not exist." }`

#### Endpoint: `GET /api/v1/gates/queues`
*   **Request:**
    ```
    Headers: Authorization: Bearer <JWT>
    Params: stadium_id=STAD_01 (string, required), page=1 (int), limit=10 (int)
    ```
*   **Response:**
    *   *Status Code:* 200 OK
    *   *Payload:*
        ```json
        {
          "data": [
            { "gate_id": "GATE_A", "queue_length": 15, "wait_time_seconds": 120 },
            { "gate_id": "GATE_B", "queue_length": 85, "wait_time_seconds": 680 }
          ],
          "pagination": { "page": 1, "limit": 10, "total_records": 12 }
        }
        ```

---

### 2. Medical Service APIs
#### Endpoint: `POST /api/v1/medical/dispatch`
*   **Request:**
    ```
    Headers: Authorization: Bearer <JWT> (scope matches authority:medical_coordinator)
    Payload:
    ```
    ```json
    {
      "incident_id": "INC-883",
      "squad_id": "SQUAD_03",
      "triage_level": "RED",
      "target_coordinates": { "latitude": 34.0522, "longitude": -118.2437 }
    }
    ```
*   **Response:**
    *   *Status Code:* 201 Created
    *   *Payload:*
        ```json
        {
          "dispatch_id": "DISP-114",
          "incident_id": "INC-883",
          "squad_id": "SQUAD_03",
          "status": "DISPATCHED",
          "estimated_arrival_secs": 105
        }
        ```
*   **Error Response:**
    *   *Status Code:* 422 Unprocessable Entity
    *   *Payload:* `{ "error_code": "SQUAD_BUSY", "message": "Medical squad SQUAD_03 is already assigned to active case CASE-402." }`

---

## 5. Authentication Flow

StadiumOS utilizes a double-token OAuth2 architecture to balance API request performance and session security.

```
[Login Request] -> [Auth Service Checks] -> [Issue JWT Access (15m) & Refresh (7d)]
                                                    |
                                                    v
[New Access Token] <--- [POST /refresh] <--- [Expired Access Token Rejected]
```

1.  **Registration:** The client sends username, password, email, and validation parameters. The service hashes the password using bcrypt, writes user records to PostgreSQL, and issues user logs.
2.  **Login Verification:** Validates credentials. Returns two cryptographically signed JWT tokens:
    *   *Access Token:* Lifetime of 15 minutes, containing user roles and scope permissions.
    *   *Refresh Token:* Lifetime of 7 days, stored securely in HTTP-only cookies.
3.  **Token Validation:** The API Gateway validates access tokens locally using public JWKS arrays, avoiding database lookup bottlenecks for every request.
4.  **Refresh Flow:** When an access token expires, the client calls `POST /api/v1/auth/refresh` using the refresh token cookie. If valid, the service issues a new access token.
5.  **Session Revocation (Logout):** The user's active session is deleted from the DB. The token's unique ID (`jti`) is added to the Redis blacklist cache to prevent unauthorized reuse of the access token during its remaining lifetime.

---

## 6. Role-Based Access Control (RBAC)

The system enforces granular endpoints mapping, validating scopes before executing request threads:

| Scope Permission | Fan | Volunteer | Vendor | Medical | Security | Operations Manager | AI Agent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET /api/v1/navigation/route` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `POST /api/v1/volunteers/checkin` | No | Yes | No | No | No | Yes | No |
| `GET /api/v1/vendors/inventory` | No | No | Yes | No | No | Yes | Yes |
| `POST /api/v1/medical/dispatch` | No | No | No | Yes | No | Yes | Yes |
| `POST /api/v1/security/dispatch` | No | No | No | No | Yes | Yes | Yes |
| `POST /api/v1/emergency/escalate` | No | No | No | Yes | Yes | Yes | Yes |
| `POST /api/v1/signage/override` | No | No | No | No | No | Yes | Yes |
| `GET /api/v1/analytics/*` | No | No | No | No | No | Yes | Yes |

*Enforcement Method:* JWT scope properties (e.g., `scopes: ["authority:medical_dispatch"]`) are checked at the microservice gateway level by validation frameworks.

---

## 7. Kafka Integration & Reliability Plan

Apache Kafka acts as the high-throughput, event-driven messaging backbone for the platform.

```
[Producer Node] -> [Partition Broker] -> [Successful Ingest]
        |
        v (Error Retry Loop: max 3 attempts)
[Retry Topic] -> [Dead Letter Queue (DLQ)] -> [Alert Engineering Team]
```

### Reliability Mechanisms

*   **Idempotency Execution:** Producers use the `enable.idempotence=true` flag. This attaches sequence numbers to payloads, preventing message duplication during network retries.
*   **Retry & Dead Letter Queue (DLQ) Strategy:**
    *   If a consumer fails to process a message due to database timeouts, the message is written to a retry topic (e.g., `QueueHigh-retry`) with a exponential back-off decay.
    *   If processing fails after 3 retry attempts, the payload is directed to the Dead Letter Queue (`QueueHigh-dlq`) for manual debugging, and an alert is sent to engineering teams.
*   **Partition Key & Message Ordering:**
    *   Messages are partitioned using specific entity keys (e.g., partitioning `CrowdDetected` by `zone_id`, `MedicalEmergency` by `incident_id`).
    *   This guarantees that events for the same zone or incident are processed chronologically within their respective partitions.

---

## 8. WebSocket Architecture

Real-time, bi-directional communication is managed by a dedicated WebSocket Gateway service backed by a Redis pub-sub connection manager.

```
       +-----------------------------------------------------------+
       |                  WEBSOCKET ARCHITECTURE                   |
       |                                                           |
       |  [Clients] <====== WebSockets ======> [WS Gateway Nodes]  |
       |                                                |          |
       |                                                v          |
       |                                         [Redis Pub/Sub]   |
       |                                                |          |
       +------------------------------------------------|----------+
                                                        v
                                                  [Kafka Alerts]
```

### Processing Steps

1.  **Connection Management:** Clients establish WebSocket connections at the API Gateway. The gateway forwards the socket connection to an active WS Gateway pod.
2.  **Session Mapping:** The WS pod registers the connection details (User ID, IP, active subscription channels) in the Redis cluster.
3.  **Real-Time Data Routing:**
    *   *Crowd Updates:* Ingests crowd density metrics and pushes updates to subscribers every 10 seconds.
    *   *Emergency Alerts:* Broadcasts medical or security alerts to nearby staff devices.
    *   *Navigation Updates:* Streams route adjustments to users during an evacuation event.
4.  **Pub-Sub Message Distribution:** If a staff member moves to a new section, the device updates its location in the database. The system publishes the coordinate change to the Redis channel, and the WS Gateway updates the client connection.

---

## 9. AI Service Integration

Backend services interact with the AI execution plane using structured, type-safe communication channels:

```
  Microservices  <====== gRPC (Sub-10ms) ======>  ML Inference
  Microservices  <====== Event Broker ==========>  AI Gateway (LangGraph)
  AI Gateway     <====== Streaming SSE ========>  Command Dashboard
```

1.  **Microservices to ML Serving Nodes:**
    *   *Protocol:* gRPC over HTTP/2.
    *   *Usage:* The Crowd Service queries predicted turnstile queues to evaluate path adjustments. gRPC ensures low-latency execution (sub-10ms) at scale.
2.  **Microservices to AI Gateway (LangGraph):**
    *   *Protocol:* Event-driven messaging via Apache Kafka.
    *   *Usage:* Safety alerts (such as `FallDetected`) are published to Kafka. The LangGraph supervisor consumes the event, coordinates the appropriate agents, and recommends responses.
3.  **AI Gateway to Client Dashboards:**
    *   *Protocol:* Server-Sent Events (SSE).
    *   *Usage:* Streams cognitive summaries (such as ongoing incident reports or RAG citations) to operators.

---

## 10. Error Handling Strategy

StadiumOS implements a structured fault handling matrix to maintain system availability during hardware or network outages:

*   **Validation Errors:** Handled using middleware validation layers (e.g., Pydantic or express-validator). Returns HTTP 400 Bad Request with details of the invalid fields.
*   **Database Lock Failures:** Captures SQL exceptions. Initiates an automated retry with jitter using a resilience library (e.g., Resilience4j).
*   **AI Serving Failures (LLM timeouts):** If Vertex AI returns a 504 gateway timeout during an active incident query, the system falls back to rule-based routing protocols and alerts the operator.
*   **Circuit Breaker Strategy:** 
    *   Critical microservice pathways (e.g., Concession orders writing to the database) are wrapped in Circuit Breakers.
    *   If downstream services fail at a rate $> 20\%$ within a sliding window, the circuit opens, routing requests to a local Redis cache and returning fallback responses (e.g., "Order queued locally for checkout") to prevent cascade failures.

---

## 11. Logging & Monitoring

*   **Structured Logging:** Outputs logs in JSON format to stdout, capturing fields like `timestamp`, `log_level`, `service_id`, `correlation_id`, and `message`.
*   **Distributed Tracing:** Implements OpenTelemetry tracers. Microservices pass the gateway-issued `X-Correlation-ID` header in downstream gRPC and REST requests, mapping execution traces in Jaeger.
*   **Metrics Scraping:** Exposes Prometheus metric endpoints (`/metrics`) on GKE pods to track key parameters (such as CPU load, active connections, database connection pools, and API error rates).
*   **Health Checks:**
    *   `/health/liveness`: Verifies the container's execution thread is running.
    *   `/health/readiness`: Verifies connection health to Kafka brokers, Redis caches, and PostgreSQL databases.

---

## 12. Directory Structure Layout

StadiumOS enforces a clean, modular directory structure across all microservices:

```
stadiumos-crowd-service/
├── cmd/
│   └── main.go                 # Ingress bootstrap entry point
├── config/
│   └── config.go               # Environment configurations loader
├── internal/
│   ├── crowd/
│   │   ├── handler.go          # HTTP REST controller layers
│   │   ├── service.go          # Core domain business logic
│   │   ├── repository.go       # PostgreSQL database access
│   │   └── entity.go           # Structs and data models
│   └── platform/
│       ├── kafka/
│       │   ├── producer.go     # Kafka producer integrations
│       │   └── consumer.go     # Kafka event consumers
│       ├── database/
│       │   └── postgres.go     # Cloud SQL database pools
│       └── cache/
│           └── redis.go        # Redis keyspace configurations
├── pkg/
│   └── telemetry/
│       └── tracer.go           # OpenTelemetry tracing utilities
├── api/
│   └── protobuf/
│       └── crowd_events.proto  # Typings and event definitions
├── Dockerfile                  # Container build instructions
└── go.mod
```

---

## 13. Sequence Diagrams

### 1. Fan Navigation Request

```
Fan Client              API Gateway            Nav Service            Crowd Service           Redis
    |                        |                      |                      |                    |
    |-- POST /route -------->|                      |                      |                    |
    |   {start, end}         |-- Forward Request -->|                      |                    |
    |                        |                      |-- Query Densities -->|                    |
    |                        |                      |                      |-- Fetch Cache ---->|
    |                        |                      |                      |<-- Return Cache ---|
    |                        |                      |<-- Return weights ---|                    |
    |                        |                      |-- Dijkstra Solver -->|                    |
    |                        |                      |   (Path calculated)  |                    |
    |                        |<-- Return path ------|                      |                    |
    |<-- 200 OK -------------|                      |                      |                    |
```

---

### 2. Crowd Congestion Prediction

```
Edge CV                 Kafka Broker            Prediction Svc         Crowd Agent          Signage Svc
   |                         |                        |                    |                     |
   |-- Emit CrowdDetected -->|                        |                    |                     |
   |                         |-- Trigger Consumer --->|                    |                     |
   |                         |                        |-- Evaluate GNN --->|                     |
   |                         |                        |   (Predicted Red)  |                     |
   |                         |                        |-- Alert Agent ---->|                     |
   |                         |                        |                    |-- Plan Route ------>|
   |                         |                        |                    |-- Override Sign --->|
   |                         |                        |                    |   "Use Corridor 14" |
```

---

### 3. Medical Emergency

```
Edge CV                 Kafka Broker            Medical Agent          GPS Service           Push Svc
   |                         |                        |                    |                     |
   |-- Emit FallDetected --->|                        |                    |                     |
   |                         |-- Trigger Consumer --->|                    |                     |
   |                         |                        |-- Query Squads --->|                     |
   |                         |                        |<-- Return closest -|                     |
   |                         |                        |-- Build Route ---->|                     |
   |                         |                        |-- Assign Task ---->|                     |
   |                         |                        |                    |-- Send Push Alert ->|
```

---

### 4. Vendor Stock Alert

```
POS Terminal            ML Service              Vendor Agent           Logistics Hub         Runner App
   |                         |                        |                     |                    |
   |-- Post transaction ---->|                        |                     |                    |
   |                         |-- Forecast stockout -->|                     |                    |
   |                         |   (depletion < 8 min)  |                     |                    |
   |                         |-- Emit LowStock ------->|                     |                    |
   |                         |                        |-- Check Inventory ->|                     |
   |                         |                        |<-- Stock available -|                    |
   |                         |                        |-- Dispatch Runner ->|                     |
   |                         |                        |                     |-- Send Push ------>|
```

---

## 14. API Security Specification

*   **Cryptographic JWT Tokens:** Validates tokens using RS256 algorithms. Access tokens must contain role scopes, user IDs, and expiration thresholds.
*   **CORS Configuration:** Rejects requests from unrecognized domains. The API gateway allows access only to registered client origins (e.g., `https://*.fifa2026.org`).
*   **Input Validation:** Enforces schema validation at the gateway level. Sanitizes request payloads to prevent Cross-Site Scripting (XSS) and SQL injection attempts.
*   **SQL Injection Prevention:** Enforces parameterized queries and object-relational mapping (ORM) abstractions across all database interfaces.
*   **CSRF Mitigations:** Stateless JWT architectures bypass CSRF vulnerabilities. For stateful dashboards, cookie updates require strict `SameSite=Strict` and `Secure` attributes.
*   **Secrets Configuration:** Application credentials and API keys are stored in Google Cloud Secret Manager and injected into container environments at runtime.

---

## 15. Backend Architecture Diagram

This ASCII diagram maps user request routing through the API Gateway, event brokers, and downstream AI components:

```
===================================================================================================
                                STADIUMOS BACKEND DATA FLOWS
===================================================================================================

  [Fan App]          [Volunteer App]          [Security Dash]         [Medical Dash]
      |                     |                        |                       |
      +---------------------+-----------+------------+-----------------------+
                                        | (HTTPS / WebSockets)
                                        v
+-------------------------------------------------------------------------------------------------+
|                                 GOOGLE CLOUD APIGEE GATEWAY                                     |
|  - JWT Authentication Validation   - Envoy Route Processing   - Token Bucket Rate Limiting      |
+-------------------------------------------------------------------------------------------------+
          |                                                               |
     (gRPC/REST)                                                    (WebSockets)
          v                                                               v
+-----------------------------------+                           +---------------------------------+
|     GKE CONTAINERIZED POOL        |                           |       WS GATEWAY CLUSTER        |
|  - Authentication Service         |                           |  - Connection Manager           |
|  - Crowd Service                  |                           |  - Active Event Streamers       |
|  - Medical Service                |                           +---------------------------------+
|  - Vendor Service                 |<===========================>|  Redis session mapping          |
+-----------------------------------+                             +---------------------------------+
          |                                                                       ^
          v (Publish Event)                                                       | (Publish Alert)
+-------------------------------------------------------------------------------------------------+
|                                    APACHE KAFKA EVENT BROKER                                    |
+-------------------------------------------------------------------------------------------------+
          |                                  |                                    |
          v (Telemetry Streams)              v (Trigger Tasks)                    v (Model Inference)
+-----------------------+          +-----------------------+            +-----------------------+
|  CLOUD BIGTABLE       |          |  LANGGRAPH ORCHESTR   |            |  VERTEX AI PIPELINES  |
|  - Sensor metrics     |          |  - Agent Node Planner |            |  - Prophet Demand     |
|  - GPS coordinates    |          |  - Gemini 1.5 Pro     |            |  - XGBoost Queues     |
+-----------------------+          +-----------------------+            +-----------------------+
```

---

## 16. Deployment Strategy

*   **Docker Containerization:** Applications are packaged into minimal multi-stage Docker images using distroless baselines to reduce vulnerability surfaces.
*   **Kubernetes Orchestration:** Deploys services to Google Kubernetes Engine (GKE) clusters, utilizing HPA configurations to scale resources dynamically during matches.
*   **Blue-Green Deployment:** Critical routing services deploy using a Blue-Green strategy. We maintain two identical environments, switching routing flags via the global load balancer only after testing green releases.
*   **Rolling Updates:** Applies rolling updates to non-critical services (maxSurge=25%, maxUnavailable=0) to ensure zero-downtime deployments.
*   **GKE Health Checks:** Enforces liveness and readiness probes to monitor container health, automatically restarting deadlocked threads or routing traffic away from failing nodes.

---

## 17. Technology Choices Matrix

| Component | Technology | Reason for Selection | Possible Alternative |
| :--- | :--- | :--- | :--- |
| **API Gateway** | Google Cloud Apigee | Enterprise-grade security capabilities, OAuth validations, and integrated developer portals. | Kong Ingress / Ambassador |
| **Microservice Framework** | Go (Golang) | Low memory footprint, fast execution speeds, and native concurrency support. | Node.js Express / NestJS |
| **Event Broker** | Apache Kafka (Confluent) | High throughput capacity, partition-level event ordering, and message replay. | Google Cloud Pub/Sub |
| **In-Memory Caching** | Cloud Memorystore for Redis | Sub-millisecond read/write performance, distributed keyspaces, and session store. | Memcached |
| **AI Orchestration** | LangGraph (Python wrapper) | Stateful graph execution, conditional logic routing, and agent collaboration. | CrewAI / AutoGen |
| **Generative LLM Core** | Gemini 1.5 Pro | 2M token context window allows processing of complete stadium safety handbooks in queries. | GPT-4o / Claude 3.5 Sonnet |
| **Deployment Engine** | GKE Autopilot | Managed Kubernetes control planes, automated OS patching, and resource scaling. | Amazon EKS |
| **Infrastructure Deployment**| Helm Charts | Packages Kubernetes configurations, simplifying multi-environment deployments. | Kustomize |
| **Distributed Tracing** | OpenTelemetry / Jaeger | Open standards integration, cross-service trace propagation, and latency graphs. | AWS X-Ray |
| **Metrics Scraping** | Prometheus & Grafana | Standard metrics gathering, real-time alerting, and performance monitoring. | Datadog |
| **Object Store** | Google Cloud Storage (GCS) | Cloud object storage with high availability and automated lifecycle management. | AWS S3 |
| **Primary Databases** | Cloud SQL for PostgreSQL | ACID compliance, JSON query support, and read-replica scaling. | Cloud Spanner |
