# StadiumOS: Monorepo Platform
### The AI Operating System for Smart Stadiums (FIFA World Cup 2026 Edition)

Welcome to the production-ready monorepo for **StadiumOS**. This repository is structured using an **Nx** workspace layout, encapsulating frontend applications, backend event-driven microservices, LangGraph AI orchestration nodes, Vertex MLOps pipelines, local edge computer vision systems, and Kubernetes Terraform/Helm deployment charts.

---

## 1. Directory Structure

```text
stadiumos-monorepo/
├── .github/                    # CI/CD Workflows (GitHub Actions)
├── apps/                       # Frontend Applications & Edge Services
│   ├── ops-dashboard/          # React Operations Dashboard (Vite)
│   └── cv-edge/                # Edge YOLOv8 & DeepStream scripts
├── backend/                    # Core Backend Services
│   └── fastapi-service/        # Core FastAPI backend, WebSockets, & AI Copilot
├── libs/                       # Shared modules & domain packages
│   ├── shared/                 # Multi-language helper utilities
│   ├── schemas/                # Protobuf and database schemas
│   └── components/             # Reusable UI component libraries
├── deployment/                 # Infrastructure deployment configurations
│   ├── terraform/              # Terraform configurations for GKE, Cloud SQL
│   └── helm/                   # Helm charts for GKE deployments
├── docs/                       # Project system documentation
├── package.json                # Root package configurations
├── docker-compose.yml          # Local multi-container database runner
├── .env.template               # Template environment variables
├── nx.json                     # Nx workspace configurations
└── tsconfig.base.json          # Shared TypeScript base configs
```

---

## 2. Quick Start

### Prerequisites
1.  **Node.js (v18+)** & **npm**
2.  **Python (3.10+)** & **virtualenv**
3.  **Docker** & **Docker Compose**
4.  **Nx CLI** (Global installation):
    ```bash
    npm install -g nx
    ```

### Ingress Bootstrap Setup
1.  Clone the repository and install dependency groups:
    ```bash
    npm install
    ```
2.  Initialize the local Docker database container stack:
    ```bash
    docker-compose up -d
    ```
    This launches PostgreSQL (port 5432), Redis (port 6379), and Confluent Kafka (ports 9092, 2181) locally.
3.  Copy and populate the environment configuration:
    ```bash
    cp .env.template .env
    ```
### Quick Demo via Docker

To run the full stack (Database, Cache, Event Bus, Backend, Edge CV, Frontend) instantly:

```bash
# Ensure .env is set up from .env.template first!
docker-compose build
docker-compose up -d
```

### Services and Ports Map
| Service | Port | Description |
|---------|------|-------------|
| **Frontend (Ops Dashboard)** | `:3000` | Main Web UI (React/Vite). Access via `http://localhost:3000` |
| **Backend (FastAPI)** | `:8000` | Core API & WebSockets. Access via `http://localhost:8000` |
| **PostgreSQL** | `:5432` | Relational Database |
| **Redis** | `:6379` | Ephemeral Cache & State Store |
| **Kafka Broker** | `:9092` | Event Streaming Platform |
| **Zookeeper** | `:2181` | Kafka Coordinator |
| **CV Edge** | None | Runs in background processing camera streams |

### Environment Variables & Integrations
StadiumOS relies on `.env` configuration. Crucial integrations:
- `STADIUMOS_PG_*` / `STADIUMOS_REDIS_*` / `STADIUMOS_KAFKA_*`: Core infrastructure connections.
- `LLM_PROVIDER` (or `COPILOT_LLM_PROVIDER`): Set to `gemini`, `openai`, etc., along with corresponding API Keys (`GEMINI_API_KEY`, etc.) for AI Copilot functionality.
- `EDGE_CAMERA_SOURCE`: Set to `synthetic` for local/CI simulation or `0` for a physical webcam.

### Cloud Deployment (GKE)
For Kubernetes deployment, manifests are provided in `deployment/kubernetes/gke-deployment.yaml`.
Ensure `stadiumos-db-secrets` and `stadiumos-config` ConfigMaps/Secrets are provisioned in your cluster before applying.

For more details, see [DEMO.md](DEMO.md).

---

## 3. Development Standards
*   **Git Branching:** Standard GitFlow models are enforced. Develop on local workspaces using `feature/MOD-{TaskID}-{description}` and target PRs to `develop`.
*   **Commit Formats:** Conventional Commits (`feat(scope): descriptions`, `fix(scope): description`).
*   **A11y & Design:** Frontend layouts use Material Design 3 and satisfy WCAG 2.2 AA accessibility ratings.
*   **Edge CV Blurring:** Edge pipelines enforce strict face/plate blurring before cloud upload to comply with GDPR privacy rules.
