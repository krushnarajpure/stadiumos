# Backend Microservices

This directory contains backend microservices for the StadiumOS platform:

## Directory Index
- `express-service/`: A Node.js and Express microservice configured with TypeScript. Handles real-time WebSockets, Kafka consumers, and API Gateway validations.
- `fastapi-service/`: A Python 3.12 microservice utilizing FastAPI. Coordinates ML model inference feeds, Bigtable logging, and database operations.

## Core Guidelines
- Enforce parameterized SQL queries to prevent SQL injections.
- Separate controllers, routing endpoints, and business service layers.
- Maintain structured log formats using common templates.
