# StadiumOS: Production Infrastructure Design Document
### Enterprise Google Cloud Platform (GCP) Deployment & Multi-Region Topology (FIFA World Cup 2026 Edition)
**Author:** Principal DevOps Architect, Google Cloud  
**Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Cloud Architecture Overview

StadiumOS targets an enterprise-grade, hybrid edge-cloud footprint hosted on **Google Cloud Platform (GCP)**. It is designed to satisfy the safety, latency, and availability demands of the FIFA World Cup 2026 matches.

```
+-------------------------------------------------------------------------------------------------+
|                                    GOOGLE CLOUD INFRASTRUCTURE                                  |
|                                                                                                 |
|   [ Edge Layer ]       ======>   [ GCP Cloud Ingress ]   =======>   [ Multi-Zone GKE Core ]     |
|   - Jetson CV nodes              - Cloud Load Balancer              - Istio Service Mesh        |
|   - Private 5G LAN               - Cloud Armor WAF                  - Autoscaled Pods           |
+-------------------------------------------------------------------------------------------------+
```

The cloud core operates across multiple availability zones in active-active topologies, while edge locations (CCTV networks, turnstile IoTs, concession registers) process video and sensory inputs locally, uploading only structured metadata.

---

## 2. Kubernetes Cluster Design

The platform uses **Google Kubernetes Engine (GKE) Autopilot** to coordinate containers. 

*   **Node Pool Separation:**
    *   *System Pool:* Stateless microservices (Auth, User, Fan, Volunteer) running on cost-effective E2 compute nodes.
    *   *AI/ML Inference Pool:* Auto-scaled GPU node instances (equipped with NVIDIA L4 or T4 GPUs) dedicated to running PyTorch Geometric Graph Convolutional networks.
*   **Logical Isolation via Namespaces:**
    *   `stadiumos-system`: Contains core business logic containers.
    *   `stadiumos-ai-ml`: Dedicated to LangGraph orchestrators and Vertex AI endpoints.
    *   `stadiumos-monitoring`: Hosts Prometheus, Grafana, and Jaeger instances.
*   **Persistent Volume Mapping:** Uses GCP Managed Filestore CSI drivers to provide shared, write-many persistent storage pools for compliance report generation.

---

## 3. Docker Image Strategy

To minimize vulnerability surfaces and accelerate deployment speeds, the system implements a strict Docker packaging strategy:

*   **Multi-Stage Builds:** Code compilation steps occur in separate builder environments; compiled binary distributions are copied into clean runtime base containers.
*   **Distroless Baselines:** Python and Node runtimes build on distroless Alpine baselines. These images strip packaging tools (e.g., `pip`, `apt`, `npm`) and shell interfaces, reducing security risks.
*   **Vulnerability Scanning:** Artifact Registry scans images for vulnerabilities during push events. Images with high-severity vulnerabilities are blocked from deployment by GKE binary authorization policies.

---

## 4. Networking Topology

```
+-----------------------------------------------------------------------------+
|                            STADIUMOS GCP VPCI                               |
|                                                                             |
|   +-----------------------+     +-------------------+     +-------------+   |
|   |  Public Ingress Subnet|     |   Private GKE     |     | Private DB  |   |
|   |  - Cloud Load Balancer|====>|   Subnet          |====>| Subnet      |   |
|   |  - Cloud Armor WAF    |     |   - Service Mesh  |     | - Cloud SQL |   |
|   +-----------------------+     +-------------------+     +-------------+   |
+-----------------------------------------------------------------------------+
```

*   **Private VPC Layout:** Implements a Virtual Private Cloud (VPC) with three segregated subnets: Public Ingress Subnet, Private GKE Subnet, and Private Database Subnet.
*   **NAT Gateways:** GKE node instances do not possess public IP addresses. External API calls (e.g., Weather API, Twilio, Firebase) route through Google Cloud NAT gateways.
*   **VPC Peering:** Secure VPC peering links the private GKE network to Cloud SQL databases and Vertex AI endpoints, keeping database traffic isolated from the public internet.

---

## 5. Global Load Balancing

*   **Cloud Load Balancing (GCLB):** A global HTTP(S) Load Balancer acts as the entry point, routing requests to the nearest healthy GKE region.
*   **Anycast IP Routing:** Uses Google's global Anycast IP infrastructure to route user traffic through the closest Google Cloud edge location, minimizing network latency.
*   **SSL Offloading:** Terminates TLS 1.3 connections at the GCLB edge, offloading decryption tasks from downstream Kubernetes pods.
*   **Cloud Armor integration:** Cloud Armor provides Web Application Firewall (WAF) protections, blocking SQL injection, Cross-Site Scripting (XSS), and DDoS attacks.

---

## 6. API Gateway

*   **Apigee Gateway:** Deployed behind the Load Balancer to manage API routing, apply rate limits, validate tokens, and log API usage.
*   **Cross-Origin Resource Sharing (CORS):** Enforces strict CORS headers, restricting endpoint access to recognized domains (e.g., `https://*.fifa2026.org`).
*   **Dynamic Path Rewriting:** Translates clean external URLs into internal microservice routes (e.g., mapping `/api/v1/crowd/...` directly to the GKE `crowd-service` pod).

---

## 7. Service Mesh (Istio)

*   **Istio Sidecar Injection:** Enforces Istio service mesh configurations across GKE namespaces. Pods run Envoy proxies alongside application containers.
*   **Mutual TLS (mTLS):** Enforces strict mTLS for all pod-to-pod communications, preventing unauthorized eavesdropping on the network.
*   **Traffic Management:** Configures Istio VirtualServices to support canary releases and path-based routing.
*   **Fault Injection Testing:** Simulates network drops and timeouts using Istio virtual configs to verify microservice resilience during staging phases.

---

## 8. Autoscaling Policies

```
+-------------------------------------------------------------------------------------------------+
|                                 AUTOSCALING PROFILES                                            |
|                                                                                                 |
|   [ GKE Containers (HPA) ]              ======>             [ GKE Cluster Nodes ]               |
|   - CPU limit > 75%                                         - Provision VMs on-demand           |
|   - WS connection logs count                                - Scaling constraints logic         |
+-------------------------------------------------------------------------------------------------+
```

*   **Horizontal Pod Autoscaler (HPA):**
    *   Core microservices auto-scale based on target metrics: CPU utilization $> 75\%$ or active connection thresholds.
*   **Cluster Autoscaler:**
    *   Automatically provisions new GKE node instances when pods are pending due to resource constraints.
*   **GPU Autoscaling:**
    *   ML inference pools scale down to zero nodes during non-match hours to optimize infrastructure costs.

---

## 9. Observability & Monitoring

*   **Prometheus:** Deployed inside GKE to collect system and application metrics from `/metrics` endpoints.
*   **Grafana Dashboards:** Displays system performance metrics, including CPU utilization, memory usage, API error rates, and queue lengths.
*   **Operations Suite (Stackdriver):** Collects system telemetry and resource logs across GCP databases and GKE clusters.
*   **Alerting Policies:** Configures Slack and SMS alerts for critical operational incidents (e.g., GKE node failures, database CPU saturation, high API error rates).

---

## 10. Centralized Logging

*   **Fluentbit Log Shippers:** Fluentbit daemons collect logs from GKE containers and stream them to Google Cloud Logging.
*   **Log Storage & Retention:** Logs are structured in JSON format, indexed, and retained for 30 days. Historical compliance reports are archived to GCS.
*   **Audit Logging:** Logs all administrative command overrides (e.g., signage modifications, evacuation alerts) to Google Cloud Audit Logs.

---

## 11. Distributed Tracing

*   **OpenTelemetry SDKs:** Microservices integrate with OpenTelemetry to trace execution paths.
*   **Jaeger Collection:** envoy proxies inject tracing headers (`traceparent`) into requests. Jaeger maps execution trees across microservices, identifying performance bottlenecks.
*   **Latencies Auditing:** Tracks database query delays and RAG processing times to optimize system execution speeds.

---

## 12. Disaster Recovery Plan

*   **Active-Active Regional Topologies:** StadiumOS runs in active-active configurations across two GCP regions (e.g., `us-east1` and `us-central1`).
*   **Global Traffic Management (GTM):** Cloud Load Balancing monitors regional health, automatically redirecting traffic if a region goes offline.
*   **Recovery Metrics:**
    *   *Recovery Time Objective (RTO):* $< 15$ seconds (automated DNS failover).
    *   *Recovery Point Objective (RPO):* $< 5$ seconds (synchronous database replication).

---

## 13. Backup Strategy

*   **Cloud SQL Snapshots:** Daily automated backups are enabled for Cloud SQL PostgreSQL databases, with transactional logs retained to support point-in-time recovery.
*   **Cross-Region Replication:** DB snapshots are replicated to a secondary region to protect against regional outages.
*   **Stateful Volume Backups:** Configures backup schedules for Kubernetes persistent volumes using Google Cloud Backup for GKE.
*   **Testing Protocol:** Recovery drills are run monthly on sandboxed staging environments to verify backup files.

---

## 14. Multi-Region Deployment Topology

```
                                  +-----------------------------+
                                  |     Global Load Balancer    |
                                  |     - Cloud Armor WAF       |
                                  +-----------------------------+
                                     /                       \
                      (US-East Ingress)                     (US-Central Ingress)
                                    /                         \
                     +----------------------+         +----------------------+
                     | GKE us-east1 Cluster |         | GKE us-cent1 Cluster |
                     | - Microservices      |         | - Microservices      |
                     | - Local DB Read      |         | - Local DB Read      |
                     +----------------------+         +----------------------+
                                |                                |
                                +---------------+----------------+
                                                |
                                                v
                                  +-----------------------------+
                                  |    Cloud SQL PostgreSQL     |
                                  |    (Multi-Zone HA Master)   |
                                  +-----------------------------+
```

This topology uses Global Load Balancing to route user requests to the nearest GKE cluster, keeping database latency low and ensuring system redundancy.

---

## 15. High Availability (HA)

*   **Multi-Zone Master Databases:** Cloud SQL runs in a multi-zone configuration with synchronous replication, enabling automated failover if the primary zone fails.
*   **Kafka Cluster Topology:** Deploys Kafka brokers across three availability zones with a replication factor of 3 to prevent data loss.
*   **Pod Anti-Affinity:** Kubernetes pod scheduling policies distribute microservice replicas across different nodes and availability zones, preventing single points of failure.

---

## 16. Continuous Integration & Continuous Deployment (CI/CD)

The CI/CD pipeline automates testing, container packaging, and deployment to GKE:

```
[Code Push feature/*] -> [Run Linters & SonarQube] -> [Run Unit Tests]
                                                            |
                                                            v
[GKE Release Deploy] <--- [GCR Registry Push] <--- [Docker Image Build]
```

*   **Verification:** Pull requests targeting `develop` or tag releases on `main` trigger the automation pipeline.
*   **Artifact Registry:** Verified Docker images are pushed to Google Artifact Registry.
*   **GitOps Deployment (ArgoCD):**argoCD monitors Git configuration updates, automatically deploying updated Helm releases to target GKE namespaces.

---

## 17. GitHub Actions Pipeline Specification

```yaml
name: StadiumOS CI/CD Pipeline

on:
  push:
    branches: [ develop, main ]
  pull_request:
    branches: [ develop ]

env:
  PROJECT_ID: google-deepmind-stadiumos
  GAR_LOCATION: us-central1-docker.pkg.dev/google-deepmind-stadiumos/registry

jobs:
  validate-and-test:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout Code
      uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Run Linters & Audits
      run: |
        npm ci
        npm run lint

    - name: Run Unit Tests
      run: npm run test

  build-and-deploy:
    needs: validate-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
    - name: Checkout Code
      uses: actions/checkout@v3

    - name: Authenticate to GCP
      uses: google-github-actions/auth@v1
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v1

    - name: Configure Docker authentication
      run: gcloud auth configure-docker us-central1-docker.pkg.dev

    - name: Build & Publish Containers
      run: |
        docker build -t $GAR_LOCATION/backend-express:latest -f apps/backend-express/Dockerfile .
        docker push $GAR_LOCATION/backend-express:latest

    - name: Deploy Helm Charts to GKE
      run: |
        gcloud container clusters get-credentials stadiumos-gke-cluster --region us-central1
        helm upgrade --install stadiumos deployment/helm -f deployment/helm/values-prod.yaml
```

---

## 18. Secrets Management

*   **Google Cloud Secret Manager:** Stores system secrets, database passwords, API tokens, and certificate keys.
*   **External Secrets Operator (ESO):** Installed in GKE, ESO securely syncs secret values from GCP Secret Manager to Kubernetes Secrets.
*   **Pod Injection:** Microservices read secrets from container environment variables at runtime, keeping credentials out of image configurations or git repositories.

---

## 19. Infrastructure as Code (IaC)

*   **Terraform Mappings:** Deploys and manages VPC subnets, GKE clusters, Cloud SQL databases, Redis instances, and IAM permissions.
*   **State Locking:** Stores Terraform state files in a secure GCS bucket, using Cloud KMS keys and state locking to prevent concurrent deployment conflicts.
*   **Plan Validation:** Pull requests run `terraform plan` to validate changes before deployments are approved.

---

## 20. Cost Optimization Plan

*   **Dynamic Scaling Rules:** ML GPU nodes scale down to zero during non-match hours to reduce idle compute costs.
*   **Preemptible VM Nodes:** Runs non-critical testing workloads on GKE preemptible node pools to lower compute expenses.
*   **Storage Lifecycle Rules:** Moves old CCTV clips and telemetry logs from GCS Standard storage to Nearline/Archive storage classes automatically.
*   **Database Idle Suspension:** Automatically suspends non-production development databases during offline hours.

---

## 21. Infrastructure Security Hardening

*   **Private GKE Clusters:** GKE control plane endpoints are restricted to authorized corporate networks, and nodes use private IP addresses.
*   **Pod Security Policies:** Restricts container execution permissions, blocking root-privilege execution, raw network access, and host path mounts.
*   **Network Policies (Calico):** Enforces network policies inside GKE to block unauthorized communication between namespaces (e.g., blocking the `ops-dashboard` from connecting directly to the database).
*   **Cloud Armor Web Application Firewall (WAF):** Evaluates OWASP Top 10 rules to block malicious traffic at the load balancer.
*   **IAM Least Privilege Roles:** Enforces strict role definitions, limiting service account scopes to their specific operational tasks.

---

## 22. Production Readiness Checklist

Before launching StadiumOS for the tournament, verify the following configuration status:

*   [ ] **Reliability:** Multi-region failover and point-in-time recovery parameters are tested.
*   [ ] **Scale:** Locust tests verify GKE and database scaling under simulated match day loads.
*   [ ] **Security:** Penetration audits, RBAC checks, and secret rotations are complete.
*   [ ] **Observability:** Prometheus metrics, Stackdriver logs, and Jaeger trace lines are active.
*   [ ] **Edge CV:** Blurring filters are verified on all camera feeds to protect user privacy.
*   [ ] **Alerts:** On-call alerts and support paths are configured for engineering teams.
*   [ ] **Grounding:** RAG vector search indexes and safety verification models are validated.

---

## 23. Complete Infrastructure Map

This diagram maps the interactions between the edge nodes, network gateways, and multi-region GKE clusters:

```
===================================================================================================
                                STADIUMOS GCP PLATFORM MAP
===================================================================================================

 [ Edge Camera ]            [ Turnstile IoT ]           [ Vendor POS ]            [ Transit API ]
        |                           |                          |                         |
   (RTSP Stream)              (MQTT Ingest)              (HTTPS POS)                (JSON REST)
        |                           |                          |                         |
        v                           v                          v                         v
+---------------+           +---------------+          +---------------+         +---------------+
| NVIDIA AGX Edge |         | Stadium Edge  |          | Concessions   |         | City Transit  |
| CV blur/detect  |         | IoT Gateway   |          | Terminal Svc  |         | Gateway API   |
+---------------+           +---------------+          +---------------+         +---------------+
        | (Anonymized)              |                          |                         |
        +---------------------------+------------+-------------+                         |
                                                 |                                       |
                                                 v (Private 5G WAN)                      |
+----------------------------------------------------------------------------------------+
|                               GOOGLE CLOUD LOAD BALANCER                               |
|  - Anycast IP DNS Routing   - Cloud Armor WAF   - Edge TLS 1.3 Termination             |
+----------------------------------------------------------------------------------------+
                                                 |
                                                 v (VPC Peering gRPC)
+----------------------------------------------------------------------------------------+
|                                    GCP VPC NETWORK                                     |
|                                                                                        |
|   +----------------------------------------------------------------------------------+ |
|   |  GKE AUTOPILOT CLUSTER POOL                                                      | |
|   |  - Namespace: stadiumos-system                                                   | |
|   |  - Namespace: stadiumos-ai-ml (LangGraph)                                        | |
|   |  - Istio Service Mesh (mTLS Enforced)                                            | |<-+
|   +----------------------------------------------------------------------------------+ |
|                                        |                                               |
|                                        v (Internal VPC Routes)                         |
|   +----------------------------------------------------------------------------------+ |
|   |  DATA PERSISTENCE SUITE                                                          | |
|   |  - Cloud SQL Postgres (HA Master-Standby Nodes)                                  | |
|   |  - Cloud Memorystore Redis Cache                                                 | |
|   |  - Cloud Bigtable TimeSeries Log                                                 | |
|   |  - Vertex AI Vector Search Index                                                 | |
|   +----------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------+
```
