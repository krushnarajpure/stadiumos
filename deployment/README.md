# Deployment & Infrastructure as Code (IaC)

This directory contains configurations and scripts to deploy StadiumOS:

## Directory Index
- `kubernetes/`: Kubernetes manifests, ingress configurations, and deployment definitions for GKE clusters.

## Core Guidelines
- Secure control plane endpoints by restricting access to authorized networks.
- Enforce network policies inside GKE to block unauthorized communication between namespaces.
## Production Environment Variables

Ensure the following variables are configured in the production environment (e.g. Render, Vercel, or Kubernetes Secrets):

| Variable | Description | Example / Required |
| --- | --- | --- |
| `STADIUMOS_PG_HOST` | Production PostgreSQL host | `postgres-service.internal` |
| `STADIUMOS_PG_PORT` | Production PostgreSQL port | `5432` |
| `STADIUMOS_PG_DB` | Production PostgreSQL database name | `stadiumos_db` |
| `STADIUMOS_PG_USER` | Production PostgreSQL user | `hasininc` |
| `STADIUMOS_PG_PASS` | Production PostgreSQL password | `<secret_password>` |
| `STADIUMOS_REDIS_HOST` | Production Redis cache host | `redis-service.internal` |
| `STADIUMOS_REDIS_PORT` | Production Redis cache port | `6379` |
| `GEMINI_API_KEY` | Google Gemini API Key for Copilot and AI logic | `<your_gemini_api_key>` |
| `STADIUMOS_GATEWAY_JWT_SECRET` | Secret key used for signing and verifying JWT tokens | `<strong_random_secret_string>` |
| `ENVIRONMENT` | Deployment environment name | `production` |

