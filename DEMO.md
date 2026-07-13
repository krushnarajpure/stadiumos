# StadiumOS Demo Guide

Welcome to the **StadiumOS Hackathon Demo Guide**. This platform is a fully-functional, real-time AI operating system for smart stadiums.

## Prerequisites

- Docker and Docker Compose installed
- Port `8000`, `3000`, `5432`, `6379`, `9092`, and `2181` free on your local machine
- A `.env` file at the root of the project with necessary API keys (e.g., Google/OpenAI keys for the AI Copilot). 

## 1. Starting the Platform

Run the following command from the root of the repository:

```bash
docker-compose up --build -d
```

This will spin up the entire orchestration including:
1. **Postgres** (Database)
2. **Redis** (Caching / Rate Limiting)
3. **Kafka & Zookeeper** (Event Bus)
4. **FastAPI Service** (Core backend & Prediction APIs)
5. **CV Edge Service** (Computer Vision edge node simulation)
6. **Ops Dashboard** (React / Vite Frontend)

## 2. Validating Health

The platform is designed to be highly observable. Check the backend readiness:

```bash
curl http://localhost:8000/health/readiness
```
You should see `"status": "ready"`.

## 3. The Match Day Simulation

To demonstrate the full power of StadiumOS without needing actual physical camera feeds, you can run the **Match Day Demo**.

1. Navigate to the Ops Dashboard: [http://localhost:3000](http://localhost:3000)
2. In the sidebar or top navigation, click the **"Start Match Simulation"** button.
3. **Watch the dashboard come alive:**
   - **T+0**: Stadium Opens. Attendance starts increasing.
   - **T+1**: Gate congestion spikes.
   - **T+2**: Incident reported at Gate B. AI copilot provides recommendations.
   - **T+3**: High Risk warning. Copilot recommends dispatching medical/security.

The simulation injects real-time events through WebSockets, simulating crowd flow, weather changes, and security incidents. The AI Copilot continuously parses this live data to offer predictive interventions.

## 4. Teardown

```bash
docker-compose down -v
```

This will stop all containers and destroy the associated volumes.
