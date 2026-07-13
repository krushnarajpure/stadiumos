# StadiumOS: Monorepo Project Scaffolding Design
### Enterprise Monorepo Scaffolding & Code Organization Blueprint (FIFA World Cup 2026 Edition)
**Author:** Staff Software Engineer, Google Cloud  
**Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Monorepo Folder Structure

StadiumOS implements a **Workspace Monorepo** powered by **Nx** (for build, test, caching, and dependency isolation). The structural breakdown splits code boundaries into executable `apps`, reusable `libs` (shared domain logic packages), and environment configurations.

```
stadiumos-monorepo/
├── .github/                    # CI/CD Workflows (GitHub Actions)
├── apps/                       # Executable applications (build targets)
│   ├── fan-mobile/             # React Native Spectator application
│   ├── volunteer-mobile/       # React Native Staff application
│   ├── ops-dashboard/          # React Command Center web console
│   ├── backend-express/        # Express.js real-time event service
│   ├── backend-fastapi/        # FastAPI ML integration service
│   ├── cv-edge/                # Local Edge CCTV inference system
│   └── ai-orchestrator/        # LangGraph agent orchestrator node
├── libs/                       # Shared modules & domain packages
│   ├── shared/                 # Multi-language helper utilities
│   ├── schemas/                # Protobuf and database schemas
│   └── components/             # Reusable UI component libraries
├── deployment/                 # Infrastructure deployment configurations
│   ├── terraform/              # Terraform scripts for GKE, Cloud SQL
│   └── helm/                   # Helm charts for GKE releases
├── docs/                       # Project documentation
├── scripts/                    # Build, setup, and database migration scripts
├── package.json
├── nx.json
└── tsconfig.base.json
```

### Design Decision Rationale
Decoupling application code boundaries from utility libraries ensures modularity. Changes made in the shared `libs/schemas` package dynamically trigger downstream builds and tests across affected applications (e.g., Express, FastAPI, and React apps) using Nx's dependency graph parsing.

---

## 2. Frontend Folder Structure (React / TypeScript / Tailwind)

The frontend applications (e.g., `apps/ops-dashboard`) enforce a feature-grouped directory layout:

```
apps/ops-dashboard/
├── public/                     # Static maps assets & browser blueprints
├── src/
│   ├── assets/                 # SVGs, animations, and global variables
│   ├── components/             # Reusable design components
│   │   ├── ui/                 # Material Design 3 elements
│   │   ├── map/                # Mapbox canvas overlay components
│   │   └── ai/                 # Copilot chat cards
│   ├── features/               # Domain-specific modules
│   │   ├── crowd/              # Ingress streams & heatmaps
│   │   ├── medical/            # Clinic grids & responder updates
│   │   └── auth/               # Login & authentication panels
│   ├── hooks/                  # Custom React hooks (WS streams, SSE listeners)
│   ├── services/               # HTTP client instances (Axios wrappers)
│   ├── context/                # Global React contexts (WebSocket connectivity)
│   ├── utils/                  # Coordinate calculations & formatter tools
│   ├── types/                  # TypeScript interface declarations
│   ├── App.tsx                 # Core app ingress router
│   ├── main.tsx                # Client DOM bootstrapper
│   └── index.css               # Tailwind baseline declarations
├── tailwind.config.js          # Tailwind theme configurations
├── tsconfig.json               # Local TypeScript configuration
└── vite.config.ts              # Vite bundle optimization settings
```

### Design Decision Rationale
Grouping modules under `features/` (e.g., putting all medical charts, maps, and APIs inside `features/medical/`) prevents folder bloat, allowing developers to manage domain logic, components, and services in a single place.

---

## 3. Backend Folder Structure (FastAPI & Express)

StadiumOS splits backend roles: **Express.js** handles high-concurrency WebSocket streams and real-time alerts, while **FastAPI** handles ML pipeline integrations and RAG query processing.

### Express Service Scaffolding (`apps/backend-express/`)
```
apps/backend-express/
├── config/                     # Database pools and Kafka configurations
├── src/
│   ├── controllers/            # Request handlers (translates HTTP to service calls)
│   ├── routes/                 # Endpoint path mapping layers
│   ├── services/               # Core business logic execution
│   ├── models/                 # ORM schema models (PostgreSQL mappings)
│   ├── middleware/             # JWT auth check, CORS, rate limits
│   ├── utils/                  # String formatters & error wrappers
│   ├── kafka/                  # Kafka producer & consumer handlers
│   ├── redis/                  # Redis keyspace caching utilities
│   └── app.ts                  # Express server configurations
├── package.json
└── tsconfig.json
```

### FastAPI Service Scaffolding (`apps/backend-fastapi/`)
```
apps/backend-fastapi/
├── app/
│   ├── api/                    # API routes & endpoint controller functions
│   ├── core/                   # Security, configs, and dependency injection
│   ├── db/                     # Bigtable sessions & Postgres pools
│   ├── models/                 # SQLAlchemy structural models
│   ├── services/               # Machine Learning inference wrappers
│   ├── utils/                  # Python logging formatters
│   └── main.py                 # FastAPI system ingress
├── pyproject.toml
└── requirements.txt
```

### Design Decision Rationale
*   *Express (TypeScript):* Selected for WebSockets, leveraging Node's non-blocking I/O event loops for routing real-time telemetry.
*   *FastAPI (Python):* Selected for ML inference routing, utilizing Python's ecosystem (TensorFlow, NumPy) with asynchronous endpoints support.

---

## 4. AI Orchestration Folder Structure (LangGraph)

The cognitive orchestration layer is managed as a standalone Python application in `apps/ai-orchestrator`:

```
apps/ai-orchestrator/
├── config/                     # Vertex AI model parameters & configurations
├── src/
│   ├── agents/                 # Specialized agents (Crowd, Security, Medical)
│   ├── tools/                  # Agent tool definitions (e.g., signage override calls)
│   ├── prompts/                # Injected prompt templates registry
│   ├── rag/                    # Vector Database retrieval clients
│   ├── memory/                 # Short-term checkpointing & Redis session trackers
│   ├── graph.py                # LangGraph workflow definition & state logic
│   └── main.py                 # Kafka alert listener & router
├── pyproject.toml
└── README.md
```

### Design Decision Rationale
Decoupling the AI Orchestrator ensures that agent execution, prompt versioning, and Vector RAG lookup metrics are evaluated independently. The agent loop runs as a stateless worker consuming Kafka alert triggers.

---

## 5. Machine Learning Folder Structure (Vertex MLOps)

The ML pipelines are organized in the `ml/` directory, optimized for integration with Vertex AI training workflows:

```
ml/
├── data/                       # Local verification samples (git-ignored)
├── training/                   # Model training code
│   ├── pipelines/              # Vertex AI pipeline definitions
│   └── tasks/                  # Training tasks (XGBoost, GNN, Prophet)
├── models/                     # Custom model configuration files
├── evaluation/                 # Metrics calculators and validation checks
├── inference/                  # Inference containers wrapping models
├── registry/                   # Model version metadata templates
├── pyproject.toml
└── README.md
```

### Design Decision Rationale
Separating training tasks, evaluation metrics, and inference wrappers allows ML Engineers to work on model optimization without affecting the live backend microservices.

---

## 6. Computer Vision Folder Structure (Edge AI)

Edge processing scripts are packaged in the `cv-edge/` directory, optimized for deployment on NVIDIA Jetson edge nodes using DeepStream:

```
apps/cv-edge/
├── config/                     # DeepStream pipelines & YOLOv8 parameters
├── src/
│   ├── detection/              # YOLOv8 target bounding box detections
│   ├── tracking/               # ByteTrack tracking algorithms
│   ├── queue_detection/        # Queue calculations & tripwire boundaries
│   ├── fall_detection/         # Action classification (SlowFast networks)
│   └── utils/                  # Privacy filters (Gaussian blur modules)
├── docker-compose.edge.yaml
└── main.py                     # RTMP stream controller loop
```

### Design Decision Rationale
Isolating edge CV structures ensures that localized hardware constraints (e.g., TensorRT builds, DeepStream configuration files) are separated from cloud core directories.

---

## 7. Deployment Configuration Folder Structure

Deployment configurations are centralized in the `deployment/` directory, enabling infrastructure-as-code deployments:

```
deployment/
├── terraform/                  # Terraform configurations for GKE & Cloud SQL
│   ├── modules/                # Reusable resource configurations
│   ├── environments/           # Environment definitions (staging, prod)
│   └── main.tf
├── helm/                       # Helm charts for GKE deployments
│   ├── values-staging.yaml     # Staging environment variables
│   ├── values-prod.yaml        # Production environment variables
│   └── Chart.yaml
└── docker/                     # Application Dockerfiles
    ├── backend-express.Dockerfile
    ├── backend-fastapi.Dockerfile
    └── ai-orchestrator.Dockerfile
```

---

## 8. Shared Packages (`libs/`)

To prevent code duplication across different applications, shared code is organized into reusable packages:

```
libs/
├── shared/                     # Multi-language helper utilities
│   ├── ts/                     # Shared TypeScript utilities
│   └── python/                 # Shared Python utilities
├── schemas/                    # Database and event schemas
│   ├── protobuf/               # gRPC definitions & Kafka schemas
│   └── relational/             # Database migrations
└── components/                 # Reusable UI component libraries
```

---

## 9. Configuration Files Template

### `tsconfig.base.json` (TypeScript Monorepo Configurations)
```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@stadiumos/shared/*": ["libs/shared/ts/*"],
      "@stadiumos/schemas/*": ["libs/schemas/*"]
    }
  }
}
```

---

## 10. Environment Variable Organization

StadiumOS uses a strict naming convention for environment variables. All secrets are managed in Google Cloud Secret Manager and injected at runtime.

### Variables Matrix

```
# Core Configurations
STADIUMOS_ENV=staging | production
STADIUMOS_STADIUM_ID=STAD_01_USA

# Database Configurations
STADIUMOS_PG_HOST=10.240.0.4
STADIUMOS_PG_PORT=5432
STADIUMOS_PG_DB=stadiumos_db
STADIUMOS_PG_USER=stadiumos_app_user
STADIUMOS_PG_PASS=secret-manager-ref:pg-password

# Cache Configurations
STADIUMOS_REDIS_HOST=10.240.1.8
STADIUMOS_REDIS_PORT=6379

# Kafka Broker Configurations
STADIUMOS_KAFKA_BROKERS=10.240.2.12:9092,10.240.2.13:9092

# Vertex AI Configurations
STADIUMOS_PROJECT_ID=google-deepmind-stadiumos
STADIUMOS_GEMINI_MODEL=gemini-1.5-pro
STADIUMOS_VECTOR_INDEX_ID=stadiumos-vector-search-idx
```

---

## 11. Coding Standards & Naming Conventions

*   **Variables, Functions, and Endpoint Paths:**
    *   TypeScript/JavaScript: camelCase (`userSession`, `getQueueLength`).
    *   Python: snake_case (`user_session`, `get_queue_length`).
    *   REST Endpoints: kebab-case, plural nouns (`/api/v1/stadium-zones`, `/api/v1/first-responders`).
*   **Database Tables and Columns:**
    *   PostgreSQL: snake_case for tables and column names (`incident_reports`, `triage_level`).
    *   Bigtable Row Keys: uppercase with hash separators (`STAD01#CROWD#GATE04#REV_TIMESTAMP`).
*   **Protobuf Message Formats:**
    *   Message names: PascalCase (`CrowdDetectedEvent`).
    *   Message fields: snake_case (`zone_id`, `density_sqm`).
*   **Git Branching Strategy:**
    ```
    develop  <==================================== [Locked Staging integration branch]
       ^
       | (Merge request target, code reviews & CI validations required)
    feature/MOD-012-queue-wait-times  <========= [Developers feature workspace branch]
    ```

---

## 12. Monorepo README Structure

### README Document Outline

```markdown
# StadiumOS Monorepo

Welcome to StadiumOS, the AI Operating System for Smart Stadiums (FIFA World Cup 2026).

## Directory Structure
- `apps/`: Ingress endpoints and executable applications.
- `libs/`: Shared libraries, models, and component utilities.
- `deployment/`: Terraform and Helm configuration directories.

## Prerequisites
- Node.js v18 or later
- Python 3.10 or later
- Docker & Docker Compose
- Nx CLI (`npm install -g nx`)

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```
2. Run local development databases:
   ```bash
   docker-compose -f deployment/docker/docker-compose.local.yaml up -d
   ```
3. Run the operations dashboard app:
   ```bash
   nx serve ops-dashboard
   ```

## CI/CD Pipeline
Every pull request targeting `develop` runs:
- Code linting checks
- Unit and integration tests
- Docker image building and validation checks
```

---

## 13. System Documentation Structure

System documentation is organized under the `docs/` folder, ensuring code changes are documented:

```
docs/
├── architecture/
│   ├── README.md               # Overview of System Architecture
│   ├── multi_agent_bus.md      # LangGraph state transitions details
│   └── database_layout.md      # Polyglot persistence details
├── api/
│   ├── swagger.yaml            # REST API Swagger documentation
│   └── protobuf_schemas.md     # Protobuf messaging contracts
└── runbooks/
    ├── disaster_recovery.md    # Failover instructions
    └── deployment_guide.md     # GKE deployment runbook
```
