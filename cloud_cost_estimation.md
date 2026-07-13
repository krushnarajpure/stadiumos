# StadiumOS: Cloud Economics & Cost Estimation Document
### Enterprise GCP Financial Budgeting & Scale Cost Modeling (FIFA World Cup 2026 Edition)
**Author:** Principal Cloud Economist, Google Cloud  
**Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Cost Model Assumptions

To estimate the operational budget for StadiumOS, this cost model makes the following scale assumptions:

```
+-------------------------------------------------------------------------------------------------+
|                                 STADIUMOS PROJECT SCALE                                         |
|                                                                                                 |
|   10 Active Stadiums       500,000 Concurrent Users       50,000,000 LLM Tokens / Day           |
|   High-density sensors     10,000 active staff/vol.       RAG & Incident triage actions         |
+-------------------------------------------------------------------------------------------------+
```

*   **Operating Duration:** 30 match days (one tournament month).
*   **Active Hours:** 12 hours per match day (includes pre-match ingress and post-match egress).
*   **Sensors Ingest Traffic:** 5,000 video metadata streams per stadium, pushing packets to Kafka every 2 seconds.

---

## 2. Compute Costs (GKE Autopilot)

GKE Autopilot bills dynamically for pods running on target compute profiles (CPU, Memory, and Ephemeral Storage):

### GKE Resource Allocations & Calculations
*   **Stateless Microservices (Auth, Fan, User, Volunteer):**
    *   *Configuration:* 250 replicas across 2 active regions. Each replica is configured with 2 vCPUs and 4 GB RAM.
    *   *GCP Pricing:* $\$0.0445$ per vCPU-hour; $\$0.0049$ per GB-hour.
    *   *Calculation:*
        $$\text{vCPU Cost} = 250 \times 2 \times 12\text{ hours} \times 30\text{ days} \times \$0.0445 = \$8,010.00$$
        $$\text{RAM Cost} = 250 \times 4\text{ GB} \times 12\text{ hours} \times 30\text{ days} \times \$0.0049 = \$1,764.00$$
        $$\text{Total Stateless Cost} = \$9,774.00/\text{month}$$
*   **Stateful Gateway Services (WebSockets, API Gateway):**
    *   *Configuration:* 150 replicas configured with 4 vCPUs and 8 GB RAM to handle WebSocket connections.
    *   *Calculation:*
        $$\text{vCPU Cost} = 150 \times 4 \times 12\text{ hours} \times 30\text{ days} \times \$0.0445 = \$9,612.00$$
        $$\text{RAM Cost} = 150 \times 8\text{ GB} \times 12\text{ hours} \times 30\text{ days} \times \$0.0049 = \$3,528.00$$
        $$\text{Total Gateway Cost} = \$13,140.00/\text{month}$$

**Subtotal GKE Compute: $\$22,914.00$ / month**

---

## 3. Database Core Costs (Polyglot Persistence)

### 1. Cloud SQL for PostgreSQL (Transactional Core)
*   **Configuration:** Deploys a high-availability primary instance with read replicas in secondary zones (using `db-custom-16-61440` instances: 16 vCPUs, 60 GB RAM).
*   **Calculation:**
    $$\text{Primary HA Instance} = 16\text{ vCPUs} \times 12\text{ hours} \times 30\text{ days} \times \$0.0826 \times 2\text{ (HA multiplier)} = \$9,515.52$$
    $$\text{Read Replicas} = 16\text{ vCPUs} \times 12\text{ hours} \times 30\text{ days} \times \$0.0826 \times 2\text{ replicas} = \$9,515.52$$
    $$\text{Storage (1 TB SSD)} = 1000\text{ GB} \times \$0.34/\text{month} \times 2\text{ regions} = \$680.00$$
    $$\text{Subtotal PostgreSQL} = \$19,711.04$$

### 2. Cloud Memorystore for Redis (WebSocket Cache & Session Store)
*   **Configuration:** High-availability cluster (configured with a 100 GB memory capacity).
*   **Calculation:**
    $$\text{Redis Cost} = 100\text{ GB} \times \$0.027/\text{hour} \times 12\text{ hours} \times 30\text{ days} \times 2\text{ clusters} = \$1,944.00$$

### 3. Cloud Bigtable (Spatio-Temporal IoT & Metrics Store)
*   **Configuration:** 30 nodes distributed across 3 zones (calculating $\$0.65$ node-hour fee parameters).
*   **Calculation:**
    $$\text{Bigtable Nodes} = 30\text{ nodes} \times 12\text{ hours} \times 30\text{ days} \times \$0.65 = \$7,020.00$$
    $$\text{Storage (5 TB SSD)} = 5000\text{ GB} \times \$0.17/\text{month} = \$850.00$$
    $$\text{Subtotal Bigtable} = \$7,870.00$$

**Subtotal Database Core: $\$29,525.04$ / month**

---

## 4. Apache Kafka Cluster Costs

StadiumOS runs a managed Confluent Kafka cluster to process high-throughput telemetry streams:

```
+-------------------------------------------------------------------------------------------------+
|                                     KAFKA SCALE CALCULATIONS                                    |
|                                                                                                 |
|   15,000,000 msg / hour      15 GB / hour throughput      18 TB total storage requirements      |
|   3 brokers, 3 zones         Replication factor: 3        GCP n2-standard-8 node instances      |
+-------------------------------------------------------------------------------------------------+
```

### Ingestion Metrics
*   **Message Volume:** 15,000,000 messages/hour.
*   **Data Volume:** 15 GB/hour.
*   **Storage Requirements:** 18 TB (includes replication factor).

### Compute & Storage Costs
*   **Broker Nodes:** 3 brokers (using `n2-standard-8` instances: 8 vCPUs, 32 GB RAM, priced at $\$0.3802$/hour).
    $$\text{Broker Cost} = 3\text{ brokers} \times 12\text{ hours} \times 30\text{ days} \times \$0.3802 = \$410.62$$
*   **Persistent Storage:** 18 TB SSD storage.
    $$\text{Storage Cost} = 18,000\text{ GB} \times \$0.17/\text{month} = \$3,060.00$$

**Subtotal Kafka Cluster: $\$3,470.62$ / month**

---

## 5. Network Egress & Load Balancing

Network costs scale with user requests and egress volume from the cloud to client applications:

### Network Egress Metrics
*   **Average Page Weight:** 150 KB.
*   **User Requests:** 500,000 users active during matches, averages 12 requests/hour.
*   **Total Egress Volume:**
    $$\text{Egress Volume} = 500,000\text{ users} \times 12\text{ reqs/hour} \times 150\text{ KB} \times 12\text{ hours} \times 30\text{ days} \times 10^{-6} = 32,400\text{ GB (32.4 TB)}$$

### Data Egress Costs
*   **Egress Pricing:** $\$0.08$ per GB.
    $$\text{Egress Cost} = 32,400\text{ GB} \times \$0.08 = \$2,592.00$$
*   **Load Balancing Rules:**
    $$\text{Load Balancer Fee} = 10\text{ LBs} \times 12\text{ hours} \times 30\text{ days} \times \$0.025/\text{hour} = \$90.00$$
    $$\text{Data Processing} = 32,400\text{ GB} \times \$0.008/\text{GB} = \$259.20$$
*   **Cloud Armor Security:**
    $$\text{Rules & Policy Checks} = 180,000,000\text{ API requests} \times \$0.75/\text{million} = \$135.00$$

**Subtotal Networking & Egress: $\$3,076.20$ / month**

---

## 6. Generative AI & LLM Costs (Vertex AI Gemini API)

Generative AI costs are calculated based on input and output token volumes processed by the Gemini 1.5 Pro model:

### Token Volume Metrics
*   **Total AI Requests:** 3,000,000 requests/month (averages 100,000 requests/day).
*   **Average Prompt Size:** 12,000 tokens (includes context, prompt templates, and retrieved RAG snippets).
*   **Average Output Size:** 800 tokens.

### Token Pricing (Gemini 1.5 Pro)
*   **Input Tokens:** $\$0.00125$ / 1,000 tokens.
*   **Output Tokens:** $\$0.00375$ / 1,000 tokens.

### Monthly Cost Calculations
*   **Input Tokens Cost:**
    $$\text{Input Cost} = 3,000,000\text{ requests} \times 12,000\text{ tokens} \times \frac{\$0.00125}{1000} = \$45,000.00$$
*   **Output Tokens Cost:**
    $$\text{Output Cost} = 3,000,000\text{ requests} \times 800\text{ tokens} \times \frac{\$0.00375}{1000} = \$9,000.00$$
*   **Vertex AI Vector Search Indexes:**
    $$\text{Vector Search Cost} = 10\text{ indexes} \times 12\text{ hours} \times 30\text{ days} \times \$0.22/\text{hour} = \$792.00$$

**Subtotal Generative AI: $\$54,792.00$ / month**

---

## 7. Machine Learning & GPU Costs (Vertex AI Serving)

Custom machine learning models (Wait-Time Predictors, Concessions Forecasts) run on GPU-enabled node pools:

*   **GPU Instance Pools:** 15 active nodes (using `g2-standard-8` instances: 8 vCPUs, 32 GB RAM, 1 NVIDIA L4 GPU, priced at $\$1.4013$/hour).
*   **Monthly GPU Compute Cost:**
    $$\text{Compute Cost} = 15\text{ nodes} \times 1 \text{ GPU} \times 12\text{ hours} \times 30\text{ days} \times \$1.4013 = \$7,567.05$$
*   **Vertex AI Feature Store Node:**
    $$\text{Feature Store Cost} = 12\text{ hours} \times 30\text{ days} \times \$0.27/\text{hour} = \$97.20$$

**Subtotal ML & GPUs: $\$7,664.25$ / month**

---

## 8. Logging, Monitoring & Observability

*   **Cloud Logging Ingestion:**
    *   *Volume:* 150 GB/day (4.5 TB total).
    *   *Pricing:* $\$0.50$ per GB ingested (first 50 GB/month is free).
    *   *Calculation:*
        $$\text{Log Ingestion Cost} = (4500\text{ GB} - 50\text{ GB}) \times \$0.50 = \$2,225.00$$
*   **Cloud Monitoring Metrics:**
    *   *Pricing:* $\$0.258$ per million metrics points.
    *   *Calculation:*
        $$\text{Monitoring Cost} = 5,000,000,000\text{ metric points} \times \frac{\$0.258}{1,000,000} = \$1,290.00$$

**Subtotal Observability: $\$3,515.00$ / month**

---

## 9. Budget Summary & Cost Optimization Strategies

### Cost Distribution
*   **Generative AI Tokens:** $\$54,792.00$ ($44.4\%$)
*   **Database Persistent Core:** $\$29,525.04$ ($23.9\%$)
*   **GKE Compute Engines:** $\$22,914.00$ ($18.6\%$)
*   **Machine Learning & GPUs:** $\$7,664.25$ ($6.2\%$)
*   **Centralized Observability:** $\$3,515.00$ ($2.8\%$)
*   **Confluent Kafka Broker:** $\$3,470.62$ ($2.8\%$)
*   **Networking & Egress:** $\$3,076.20$ ($2.5\%$)
*   **Total Monthly Operational Budget:** **$\$124,957.11$**

---

## 10. Cost Optimization Recommendations

```
+-------------------------------------------------------------------------------------------------+
|                                 COST REDUCTION MECHANISMS                                       |
|                                                                                                 |
|   [ Context Caching ]        =====>   [ GPU Autoscaling ]      =====>   [ Bigtable Lifecycle ]  |
|   - Cache RAG documents               - Scale to zero nodes             - Move logs to archive  |
|   - Save up to 40% on LLMs            - Save up to 50% on GPUs          - Save up to 30% on DB  |
+-------------------------------------------------------------------------------------------------+
```

1.  **Context Caching:**
    *   Enable Vertex AI Context Caching for static RAG documents (e.g., safety handbooks, match schedules). This reduces input token billing by up to $40\%$ for repeating queries.
2.  **GPU Scale-to-Zero Rules:**
    *   Configure GPU node pools to scale down to zero instances during non-match hours to minimize compute expenses.
3.  **Bigtable Storage Archiving:**
    *   Implement lifecycle policies to move old telemetry logs from Bigtable SSDs to nearline storage after 7 days, reducing database storage costs by up to $30\%$.
4.  **Network Peer Settings:**
    *   Utilize internal VPC routes and service mesh routing configurations to bypass public network paths and minimize egress costs.
