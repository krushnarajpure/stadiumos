# StadiumOS: Database Architecture Design Document
### Enterprise-Grade Polyglot Persistence & Data Modeling Specification (FIFA World Cup 2026 Edition)
**Author:** Principal Database Architect, Google Cloud  
**Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Database Philosophy

Modern mega-events like the FIFA World Cup 2026 impose highly volatile, high-throughput, and multi-modal data requirements. Relying on a single relational database for all storage patterns leads to severe resource contention, high query latencies, and system-wide bottlenecks during match windows. 

StadiumOS implements **Polyglot Persistence**—selecting specialized database engines tailored to specific data access behaviors:

```
                                  +-----------------------+
                                  |   STADIUMOS GATEWAY   |
                                  +-----------------------+
                                   /      |       |      \
                                  v       v       v       v
                          +-----------+ +-------+ +-------+ +------------+
                          | Cloud SQL | | Redis | | Cloud | | Vertex AI  |
                          | Postgres  | | Cache | | Bigtb | | Vector Search
                          +-----------+ +-------+ +-------+ +------------+
```

1.  **Relational SQL (Cloud SQL for PostgreSQL):** Ideal for structured business entities (Users, Tickets, Orders, Roster Schedules) requiring strict ACID transactions, complex relational integrity, and standard indexing support.
2.  **In-Memory Cache (Cloud Memorystore for Redis):** Serves ephemeral, high-read, low-latency requests (User Sessions, WebSocket states, Active Queue wait times) under 1ms.
3.  **NoSQL Time-Series (Cloud Bigtable):** Handles high-frequency, continuous telemetry (turnstile sensor events, GPS tracks, weather data logs) requiring massive write throughput.
4.  **Vector Search (Vertex AI Vector Search):** Provides high-dimensional approximate nearest neighbor searches for Retrieval-Augmented Generation (RAG) operations.
5.  **Object Store (Google Cloud Storage):** Stores unstructured media files (CCTV clips, blueprints, PDFs, training datasets) with lifecycle rules.

This strategy isolates transactional read-write loops from analytical or telemetry write bottlenecks, guaranteeing system uptime and performance under peak loads.

---

## 2. Data Classification

To maintain storage and query performance, the system classifies and routes data into distinct classifications:

*   **Transactional:** Relational business data. Managed via Cloud SQL for PostgreSQL. Requires strict referential integrity.
*   **Real-Time / Temporary Cache:** Short-lived operational logs, rates, and active states. Stored in Cloud Memorystore for Redis.
*   **Analytical / Historical:** Aggregated match-day telemetry, POS revenue metrics, and crowd movement histories. Managed via BigQuery.
*   **AI Knowledge Base:** Document embeddings representing SOP booklets and maps. Stored in Vertex AI Vector Search.
*   **Media Assets:** Unstructured files (images, PDFs, video clips). Managed via Google Cloud Storage (GCS).
*   **Telemetry Logs:** Continuous sensor streams. Ingested via Kafka and persisted in Cloud Bigtable.
*   **Security Logs & Audit Trails:** Administrative command overrides and user access checks. Persisted in Google Cloud Operations Log bucket.

---

## 3. PostgreSQL Schema Design

Below are the structural specifications for the primary PostgreSQL entities:

1.  **Users:** Core user accounts mapping ID, email, hashed credentials, language, status, and audit metadata.
2.  **Roles:** RBAC structures defining target operational spheres (e.g., `MATCH_DIRECTOR`, `SECURITY_OFFICER`, `VOLUNTEER`).
3.  **Permissions:** Explicit action flags mapped to roles (e.g., `authority:override_signage`, `authority:view_cctv`).
4.  **Fans:** Extends Users with match tickets, favorite teams, transit preferences, and native language metadata.
5.  **Staff:** Extends Users with job titles, supervisor IDs, department scopes, and certifications.
6.  **Volunteers:** Extends Users with check-in statuses, language capabilities, shift histories, and active tasks.
7.  **Matches:** FIFA tournament game records mapping participating teams, kickoff times, stadium IDs, match statuses, and current score variables.
8.  **Teams:** National team attributes (e.g., Country, ISO code, delegation contact info).
9.  **Stadiums:** Stadium structural configurations (e.g., Name, City, coordinate boundary arrays, total seating capacities).
10. **Seats:** Specific seat locations (e.g., Row, Block, Section, Accessibility ratings, coordinates).
11. **Tickets:** Issued match tickets linking fans, seats, match IDs, validation barcodes, and status values (e.g., `PURCHASED`, `SCANNED`).
12. **Entrances:** Stadium entrance gates (e.g., Gate IDs, coordinates, sensor IP arrays, physical safety capacities).
13. **Crowd Zones:** Physical polygon-defined zones inside corridors or plazas, mapped to coordinate arrays.
14. **Incidents:** Tracked security or operational events (e.g., physical fights, fires, structural hazards).
15. **Medical Cases:** Logged first-aid calls mapping patient descriptions, triage levels, clinic destinations, and responder teams.
16. **Vendors:** Concession or retail stand configurations (e.g., Name, Section, Terminal IDs, current owner codes).
17. **Food Inventory:** Kiosk item logs (e.g., SKU IDs, stock quantities, safety margins, pricing).
18. **Orders:** POS transactions tracking checkout time, total cost, card payment states, and bought SKUs.
19. **Parking:** Parking lot configurations (e.g., Lot IDs, total slot numbers, current occupancy metrics).
20. **Transport:** Scheduled match shuttles (e.g., Route IDs, driver details, bus capacities).
21. **Notifications:** Event notification history (e.g., targets, titles, body, status logs).
22. **Emergency Reports:** Regulatory summaries written by operators for major incident investigations.
23. **AI Recommendations:** Logged agent suggestions (e.g., action type, reasoning string, target parameters, supervisor decisions).
24. **Predictions:** Aggregated ML forecasts (e.g., queue waits, congestion, inventory shortages) logged for audit verification.
25. **Feedback:** Operator rating records assessing AI predictions accuracy, user comments, and manual adjustment logs.

---

## 4. Entity-Relationship (ER) Diagram

```
+------------------+           +------------------+           +------------------+
|      ROLES       | 1       N |    USER_ROLES    | N       1 |      USERS       |
| - role_id (PK)   |-----------| - user_id (FK)   |-----------| - user_id (PK)   |
| - role_name      |           | - role_id (FK)   |           | - email          |
+------------------+           +------------------+           | - password_hash  |
                                                              +------------------+
                                                                       |
                                         +-----------------------------+
                                         | 1 (Subtype extension)
                                         v
                      +-------------------------------------+
                      |    FANS / VOLUNTEERS / STAFF        |
                      | - user_id (PK, FK)                  |
                      | - volunteer_status / job_title      |
                      +-------------------------------------+
                                         |
                                         | N
                                         v
                              +---------------------+
                              |       TICKETS       |
                              | - ticket_id (PK)    |
                              | - user_id (FK)      |
                              | - seat_id (FK)      |-----------+
                              | - match_id (FK)     |--+        |
                              +---------------------+  |        |
                                                       |        |
         +---------------------------------------------+        |
         | N                                                    |
         v 1                                                    |
+------------------+                                            |
|     MATCHS       |                                            |
| - match_id (PK)  |                                            |
| - stadium_id (FK)|--+                                         |
+------------------+  |                                         |
                      | 1                                       |
                      v N                                       v 1
+------------------+  |        +------------------+    +------------------+
|   CROWD_ZONES    |  |        |      SEATS       |    |   INCIDENTS      |
| - zone_id (PK)   |<-+        | - seat_id (PK)   |    | - incident_id(PK)|
| - stadium_id (FK)|           | - block_id (FK)  |    | - zone_id (FK)   |
+------------------+           +------------------+    +------------------+
```

### Cardinality Specifications
*   `ROLES` to `USER_ROLES`: One-to-Many ($1:N$). A role maps to many users.
*   `USERS` to `USER_ROLES`: One-to-Many ($1:N$). A user can have multiple role configurations.
*   `USERS` to `FANS`/`VOLUNTEERS`/`STAFF`: One-to-One ($1:1$) subtype specialization hierarchy.
*   `FANS` to `TICKETS`: One-to-Many ($1:N$). A fan can purchase multiple match tickets.
*   `SEATS` to `TICKETS`: One-to-Many ($1:N$). A seat can be booked across different matches.
*   `MATCHES` to `TICKETS`: One-to-Many ($1:N$). A match has many valid tickets.
*   `STADIUMS` to `MATCHES`: One-to-Many ($1:N$). A stadium hosts multiple matches.
*   `STADIUMS` to `CROWD_ZONES`: One-to-Many ($1:N$). A stadium contains multiple polygon sectors.
*   `CROWD_ZONES` to `INCIDENTS`: One-to-Many ($1:N$). Multiple safety incidents can occur in a zone.

---

## 5. Redis Cache Architecture

StadiumOS uses Redis to cache session tokens, telemetry data, and system rate limits, optimizing response times during peak loads.

```
+-----------------------------------------------------------------------------------------------+
|                                    REDIS KEYSPACE PLAN                                        |
|                                                                                               |
|   User Sessions         JWT Blacklist         Crowd Counts          Queue Lengths   Rate Limit|
|   `session:{id}`        `blacklist:{token}`   `crowd:zone:{id}`     `queue:{id}`    `rate:{ip}`|
|   TTL: 2 Hours          TTL: 1 Hour           TTL: 10 Seconds       TTL: 30 Seconds TTL: 1 Min|
+-----------------------------------------------------------------------------------------------+
```

### TTL and Keyspace Mapping

1.  **User Sessions:**
    *   *Key Format:* `session:{user_id}`
    *   *TTL:* 2 Hours (sliding window).
    *   *Data Structure:* JSON String containing user metadata, ticket references, and current GPS coordinates.
2.  **JWT Blacklist:**
    *   *Key Format:* `blacklist:{token_jti}`
    *   *TTL:* Matches token remaining validity time (max 1 hour).
    *   *Data Structure:* Simple string value. Used by the API Gateway to drop revoked access tokens.
3.  **Live Crowd Zone Counts:**
    *   *Key Format:* `crowd:zone:{zone_id}`
    *   *TTL:* 10 Seconds.
    *   *Data Structure:* Hash mapping `people_count`, `density_sqm`, and `alert_level`.
4.  **Turnstile Queue Lengths:**
    *   *Key Format:* `queue:gate:{gate_id}`
    *   *TTL:* 30 Seconds.
    *   *Data Structure:* Hash mapping `current_count` and `est_wait_seconds`.
5.  **WebSocket Connections Registry:**
    *   *Key Format:* `ws:connection:{connection_id}`
    *   *TTL:* Infinite (removed on disconnect).
    *   *Data Structure:* Hash mapping `user_id`, `client_ip`, and `active_channels`.
6.  **Recent ML Predictions Cache:**
    *   *Key Format:* `prediction:cache:{model_id}:{zone_id}`
    *   *TTL:* 60 Seconds.
    *   *Data Structure:* JSON string caching the latest ML model prediction.
7.  **API Rate Limiting:**
    *   *Key Format:* `rate:limit:{client_ip}:{endpoint}`
    *   *TTL:* 60 Seconds.
    *   *Data Structure:* Redis Counter incremented via `INCR` commands.
8.  **Vendor Stocks Alert Cache:**
    *   *Key Format:* `vendor:alert:kiosk:{kiosk_id}`
    *   *TTL:* 5 Minutes.
    *   *Data Structure:* Key-Value flag mapping low stock items to prevent alert storms.

---

## 6. Vector Database Design

Document search is managed via **Vertex AI Vector Search**, utilizing ScaNN index models to retrieve semantic matches with low latency.

```
       +------------------------------------------------------------+
       |                  VECTOR DATABASE LAYERS                    |
       |                                                            |
       |  +-------------------+  +-------------------+  +---------+ |
       |  |  SOP Index        |  |  Volunteer Handbook|  | Map     | |
       |  |  (Emergency Rules)|  |  (Staff Rules)    |  | Vectors | |
       |  +-------------------+  +-------------------+  +---------+ |
       |           |                       |                 |      |
       |           v                       v                 v      |
       |  Metadata:           Metadata:           Metadata:         |
       |  - category: "fire"  - language: "en"    - zone: "Gate A"  |
       |  - stage: "critical" - role: "gate_check" - floor: "L1"     |
       +------------------------------------------------------------+
```

### Collection Layouts & Chunking Models

*   **Ingested Knowledge Sources:**
    1.  *Emergency SOPs:* Step-by-step procedures for fire, severe weather, structural failures, and active threats.
    2.  *Stadium Maps:* Spatial metadata, ramp structures, VIP paths, and coordinates of exits.
    3.  *Volunteer Handbook:* Rosters, policies, shift details, and translation references.
    4.  *Medical Protocols:* First-aid instructions, clinic mappings, and triage steps.
    5.  *FIFA Rules:* International compliance, field requirements, and branding policies.
    6.  *Vendor Policies:* Inventory rules, transaction audits, and safety codes.
    7.  *Transportation Plans:* Bus timelines, parking lot schedules, and transit loops.
    8.  *Accessibility Documents:* Elevator maps and accessibility requirements.
*   **Chunking Strategy:**
    *   Document AI processes PDFs, extracting tables and text formatting. Chunks are generated using a recursive text splitter (500 tokens chunk size with a 50 token overlap).
*   **Metadata Schema:**
    ```json
    {
      "source_document": "FIFA_Safety_SOP_2026.pdf",
      "page_number": 42,
      "document_category": "Emergency SOPs",
      "target_role_scope": "SECURITY_OFFICER",
      "target_stadium_id": "STAD_01"
    }
    ```
*   **Embedding Model:** Vertex AI `text-embedding-004` (768-dimension vectors).
*   **Retrieval Filtering:** When searching document vectors, the metadata filter (e.g., `target_role_scope == 'SECURITY_OFFICER'`) restricts the search space, preventing unrelated data (e.g., food safety codes) from returning during a security incident query.

---

## 7. Object Storage (GCS)

Google Cloud Storage (GCS) hosts unstructured media files and historical dataset archives. GCS buckets are configured with Object Lifecycle Management policies to optimize storage costs over time.

```
+-------------------------------------------------------------------------------------------------+
|                                     OBJECT STORAGE RETENTION                                    |
|                                                                                                 |
|   `/stadiumos-cctv-clips`       `/stadiumos-blueprints`         `/stadiumos-ml-datasets`        |
|   Retention: 30 Days            Retention: Indefinite           Retention: 1 Year               |
|   Transition to Coldline: 7d    Transition to Coldline: None    Transition to Coldline: 30d     |
+-------------------------------------------------------------------------------------------------+
```

### GCS Buckets Schema

1.  **CCTV Event Video Clips (`stadiumos-cctv-clips`):**
    *   *Usage:* Stores 30-second video segments flagged during CV events (e.g., slip-and-falls, restricted zone intrusions).
    *   *Lifecycle Policy:* Move from Standard to Coldline storage after 7 days; delete after 30 days to comply with GDPR requirements.
2.  **Stadium Spatial Blueprints (`stadiumos-blueprints`):**
    *   *Usage:* Stores stadium CAD maps, seating charts, and volunteer route diagrams.
    *   *Lifecycle Policy:* Standard storage; indefinite retention.
3.  **Machine Learning Training Datasets (`stadiumos-ml-datasets`):**
    *   *Usage:* Stores historical match telemetry logs, annotated CV frames, and transaction records for model retraining.
    *   *Lifecycle Policy:* Transition to Coldline storage after 30 days; archive to Archive storage class after 1 year.
4.  **Operational PDF Compliance Reports (`stadiumos-compliance-reports`):**
    *   *Usage:* Stores drafted incident reports, volunteer shift logs, and match-day audits.
    *   *Lifecycle Policy:* Transition to Coldline storage after 90 days; retain indefinitely for regulatory compliance.

---

## 8. Time-Series Storage (Cloud Bigtable)

For high-frequency, continuous telemetry data streams, the system utilizes Cloud Bigtable. Bigtable's row-key design is optimized for time-series queries.

```
Row-Key: [Stadium_ID]#[Sensor_Category]#[Sensor_ID]#[Reversed_Timestamp]
```

### Row-Key Design Specification

Row keys are formatted as `stadium_id#sensor_category#sensor_id#reversed_timestamp`:
*   `stadium_id` (e.g., `STAD01`): Groups data by stadium.
*   `sensor_category` (e.g., `CROWD`): Classifies the data source.
*   `sensor_id` (e.g., `GATE04`): Identifies the specific sensor or gate.
*   `reversed_timestamp` (calculated as `Long.MAX_VALUE - epoch_timestamp`): Ensures the latest telemetry readings are retrieved first during queries.

### Column Family Architecture

1.  **Metric Telemetry (`metric_family`):**
    *   *Columns:* `people_count`, `wait_time_secs`, `pos_transactions_count`, `transit_delay_mins`.
2.  **Environment Sensor Telemetry (`env_family`):**
    *   *Columns:* `temperature_celsius`, `humidity_percentage`, `noise_decibels`, `precipitation_mm_hr`.
3.  **GPS Telemetry (`gps_family`):**
    *   *Columns:* `gps_latitude`, `gps_longitude`, `gps_accuracy_meters`, `staff_status`.
4.  **Prediction Telemetry (`prediction_family`):**
    *   *Columns:* `predicted_congestion_level`, `model_id`, `inference_confidence`.

---

## 9. Data Lifecycle Policy

```
[Telemetry Ingest] -> [Real-Time Bigtable (30 Days)] -> [Archive GCS Bucket]
                                                                |
                                                                v
[Clean Deletion] <-------------------------------------- [Offline ML Training]
```

*   **Creation:** Telemetry is written directly to Kafka, which streams data to Bigtable. Relational objects (Users, Tickets, Orders) are created via the Cloud SQL master node.
*   **Updates:** Restricted to transactional PostgreSQL tables. Telemetry tables in Bigtable are append-only.
*   **Archival:** A daily Cloud Dataflow pipeline extracts records older than 30 days from Bigtable, compresses them into Parquet files, and writes them to Google Cloud Storage.
*   **Retention:** GDPR compliance limits fan GPS logs and CCTV video clips to 30 days of retention. Historical vendor transactions and safety incidents are kept indefinitely.
*   **Deletion:** Deleted records are purged from indices and databases using cascading deletion schemas.
*   **Backup & Recovery:** Daily automated, incremental snapshot backups are enabled for Cloud SQL and GCS, with cross-region replication configured to handle disaster recovery.

---

## 10. AI Data Requirements

Different AI modules utilize distinct database interfaces to retrieve operational context:

1.  **Machine Learning Services:**
    *   *Data Source:* Bigtable historical telemetry databases and the Vertex AI Feature Store.
    *   *Required Inputs:* Rolling time-series features (concourse crowd density trends over 15-minute windows, historic transaction rates).
2.  **Computer Vision Pipelines:**
    *   *Data Source:* Local Edge GPU memory buffers.
    *   *Outputs Written:* Real-time coordinate metadata streams and density metrics pushed directly to Kafka.
3.  **RAG Engines:**
    *   *Data Source:* Vertex AI Vector Search index collections.
    *   *Required Inputs:* Document embedding spaces containing emergency protocols, accessibility maps, and team match updates.
4.  **Multi-Agent Systems:**
    *   *Data Source:* PostgreSQL, Redis Session cache, and Vector databases.
    *   *Required Inputs:* Volunteer locations (PostgreSQL), task statuses (Redis), and safety regulations (Vector Database).
5.  **Analytics Service:**
    *   *Data Source:* PostgreSQL tables and BigQuery analytics data warehouses.
    *   *Required Inputs:* Historical sales metrics, aggregate security records, and transit time logs.

---

## 11. Indexing Strategy

Relational databases require optimized indexing to prevent query bottlenecks during high-traffic match windows.

*   **Tickets Table Indexing:**
    *   *Index Target:* `(match_id, ticket_status)`
    *   *Rationale:* Optimizes ticket validation scans at entrance gates.
*   **Incidents Table Indexing:**
    *   *Index Target:* `(incident_zone, incident_status)`
    *   *Rationale:* Speeds up security dashboard queries monitoring active alerts.
*   **Orders Table Indexing:**
    *   *Index Target:* `(vendor_id, transaction_time)`
    *   *Rationale:* Facilitates real-time concessions revenue tracking and inventory updates.
*   **Volunteers Table Indexing:**
    *   *Index Target:* `(active_zone, skill_flags, volunteer_status)`
    *   *Rationale:* Allows the Volunteer Agent to locate and deploy available volunteers quickly.
*   **Notifications Table Indexing:**
    *   *Index Target:* `(user_id, send_status, timestamp DESC)`
    *   *Rationale:* Accelerates notification queries on the Fan Mobile App.

---

## 12. Partitioning Strategy

As tables gather millions of rows during the tournament, table partitioning is applied to maintain index size and query performance.

```
+-------------------------------------------------------------------------------------------------+
|                                 POSTGRESQL RANGE PARTITIONING                                   |
|                                                                                                 |
|   `tickets_partition_match_01`    `tickets_partition_match_02`    `tickets_partition_match_03`  |
|   For Match 1 Records             For Match 2 Records             For Match 3 Records           |
+-------------------------------------------------------------------------------------------------+
```

### PostgreSQL Partition Layout

1.  **Tickets Table Partitioning:**
    *   *Partition Type:* List Partitioning by `match_id`.
    *   *Rationale:* Isolates ticket validation logs to the active match partition, preventing lookup slowdowns caused by historical ticket records.
2.  **Orders Table Partitioning:**
    *   *Partition Type:* Range Partitioning by `transaction_time` in 24-hour intervals.
    *   *Rationale:* Speeds up current-day sales reports and simplifies the archival of older transactional records.
3.  **Notifications Table Partitioning:**
    *   *Partition Type:* Hash Partitioning by `user_id` into 16 partitions.
    *   *Rationale:* Distributes the read-write load evenly across the database cluster.

---

## 13. Security Specification

Database security is modeled around a Zero-Trust Architecture:

*   **Encryption at Rest:** Datasets, object storage, and vector indices are encrypted using Customer-Managed Encryption Keys (CMEK) managed via Google Cloud KMS.
*   **Encryption in Transit:** All connections to SQL, Redis, and Vector databases require TLS 1.3 encryption with strict verification of root certificates.
*   **Access Control:** Downstream microservices authenticate with databases using Cloud IAM service accounts with Least Privilege permissions. Direct database root logins are blocked.
*   **PII Protection:** Edge nodes strip faces and license plates from video feeds before cloud transit. Transaction databases mask credit card numbers and fan contact information.
*   **Audit Logging:** Changes to PostgreSQL tables or system overrides are logged directly to Google Cloud Audit Logs.
*   **Database Credentials Rotation:** Cloud SQL credentials are rotated automatically every 30 days using HashiCorp Vault.

---

## 14. Performance Optimization

*   **Distributed Caching (Redis):** Caches highly accessed variables (e.g., ticket seat positions) in memory, avoiding redundant SQL queries.
*   **Read Replicas:** Deploys read replicas across availability zones, routing read-heavy queries (e.g., fan requests, analytics metrics) away from the primary master database.
*   **Connection Pooling (PgBouncer):** Deploys PgBouncer as a sidecar container in GKE to manage PostgreSQL connections, reducing database overhead.
*   **Data Compression:** Compresses telemetry Parquet files in GCS, lowering long-term storage costs.
*   **Batch Processing:** Pushes concessions inventory updates and telemetry logs to databases in batches to minimize transaction overhead.

---

## 15. Database Architecture Diagram

This ASCII diagram maps the interactions between the microservices and the polyglot persistence layer:

```
===================================================================================================
                                STADIUMOS DATA PERSISTENCE PLANE
===================================================================================================

  [API Gateway]        [Crowd Service]      [Vendor Service]     [Medical Service]    [RAG Service]
        |                     |                    |                     |                  |
   REST / gRPC           gRPC / Kafka          REST / POS           gRPC / WS           gRPC / Cos
        |                     |                    |                     |                  |
        v                     v                    v                     v                  v
+---------------+     +---------------+    +---------------+     +---------------+  +--------------+
| Cloud SQL     |     | Cloud Memoryst|    | Cloud SQL     |     | Cloud Bigtable|  | Vertex AI    |
| Postgres      |     | Redis Cluster |    | Postgres      |     | (Time-Series) |  | Vector Search|
| Primary Node  |     | (Active Cache)|    | Read Replica  |     | (GPS & IoT)   |  | (Embeddings) |
+---------------+     +---------------+    +---------------+     +---------------+  +--------------+
        |                     ^                    ^                     |                  ^
        | (Sync Replication)  | (Cache Updates)    | (Read Queries)      | (Batch Load)     |
        v                     |                    |                     v                  |
+---------------+             +--------------------+             +---------------+          |
| Cloud SQL     |                                                | Google Cloud  |          |
| Postgres      |===============================================>| Storage (GCS) |----------+
| Standby Node  |           (Nightly Transaction Archival)       | (PDFs & Media)|  (Embeddings Load)
+---------------+                                                +---------------+
```

---

## 16. Scalability Strategy

To handle high-throughput demands during a match day (100,000 concurrent fans + staff), StadiumOS implements the following scaling strategies:

1.  **Write Isolation via Apache Kafka:** Ingests turnstile rates, sensor readings, and sales logs to Kafka first, managing spike loads and preventing database write locks.
2.  **Horizontal Read Scaling:** Routes analytical and read queries to read replicas, preserving the master database for write transactions.
3.  **Redis Cache Offloading:** Resolves up to 85% of standard read requests in memory, bypassing database engines.
4.  **Autoscaling Bigtable Nodes:** Auto-scales Bigtable nodes based on CPU usage and write latency metrics.
5.  **Vertex Vector Search Scaling:** Indexes partition boundaries across GKE nodes to support low-latency vector queries under load.

---

## 17. Disaster Recovery Specification

StadiumOS uses a multi-region deployment model to ensure disaster recovery:

*   **Replication Strategy:** Cloud SQL operates in a Multi-Zone High Availability configuration with synchronous replication. A cross-region read replica is maintained for failover support.
*   **Failover Execution:** The Global Cloud Load Balancer performs automated health checks. If the primary zone fails, the load balancer promotes the standby replica to master and redirects traffic in under 15 seconds.
*   **Point-in-Time Recovery (PITR):** Enables write-ahead logging (WAL) in Cloud SQL, allowing restoration of database states to any millisecond within the past 14 days.
*   **Data Recovery Testing:** Cross-functional teams run automated recovery drills monthly using backup files to ensure compliance with Recovery Time Objectives (RTO < 30 seconds) and Recovery Point Objectives (RPO < 5 seconds).

---

## 18. Multi-Tournament Global Expansion Schema

To support multiple stadiums and tournaments globally without requiring structural database redesigns, the system implements the following schemas:

```
+-------------------------------------------------------------------------------------------------+
|                               GLOBAL TOURNAMENT TENANCY SCHEMAS                                 |
|                                                                                                 |
|   `STAD01_USA` Partition          `STAD02_MEX` Partition          `STAD03_CAN` Partition          |
|   FIFA World Cup 2026             FIFA World Cup 2026             FIFA World Cup 2026             |
+-------------------------------------------------------------------------------------------------+
```

1.  **Multi-Tenancy Partitioning Structure:**
    *   Appends a composite country and tournament ID prefix (e.g., `FWC2026#STAD01#`) to row keys and entities. This isolates data logically while utilizing the same database schemas.
2.  **Dynamic Database Routing Maps:**
    *   API gateways route user connections to regional database clusters based on the stadium prefix, maintaining low latencies for international venues.
3.  **Stateless Microservice Infrastructure:**
    *   Deploy stateless microservices to local regional GKE clusters. This allows the system to scale to new venues without requiring database migrations.
