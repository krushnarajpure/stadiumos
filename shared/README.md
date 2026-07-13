# Shared Packages & Contracts

This directory contains code and contract definitions shared across all microservices:

## Directory Index
- `types/`: Common TypeScript type declarations.
- `contracts/`: OpenAPI definitions and API schemas.
- `constants/`: Shared constants and thresholds.
- `utils/`: Common utilities (e.g., error handlers).

## Core Guidelines
- Avoid putting service-specific logic in this directory.
- Update contract definitions before modifying API endpoints to prevent breaking integration paths.
