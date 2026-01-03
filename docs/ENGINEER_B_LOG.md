# JagaWarga PoC: Engineer B's Implementation Log

This document tracks the step-by-step implementation of the Backend Services (Report Service) by Engineer B.

## 📅 Timeline & Progress

### ✅ Step 1: Foundation & Dependencies (Completed)
**Goal:** Setup Phoenix project dependencies and configuration.

1.  **Dependency Management**:
    *   Updated `src/services/report/mix.exs` to include critical libraries:
        *   `gnat` (NATS client)
        *   `prom_ex` (Prometheus metrics)
        *   `jason` (JSON parser)
        *   `req` (HTTP client)
        *   `telemetry_*` (Observability)
    *   Resolved `mix.lock` missing issues in Docker by running:
        ```bash
        docker compose run --rm report-service mix deps.get
        ```

2.  **Docker Configuration**:
    *   **Dockerfile Optimization**: Changed `ENTRYPOINT` to `CMD ["mix", "phx.server"]` in `src/services/report/Dockerfile`.
        *   *Why?* To allow easier overriding of commands (e.g., running migrations or tests) without conflicting with the server startup command.
    *   **Volume Mapping**: Updated `compose.yml` for `report-service` to sync source code between host and container:
        ```yaml
        volumes:
          - ./src/services/report:/app
          - /app/deps      # Prevent host override
          - /app/_build    # Prevent host override
        ```

3.  **Database Configuration**:
    *   Updated `src/services/report/config/dev.exs` to support dynamic configuration via Environment Variables:
        *   Use `System.get_env("DB_HOST", "localhost")` instead of hardcoded values.
        *   Added `migration_lock: nil` to `Report.Repo` config.
        *   *Why?* CockroachDB does not support Postgres-style table locking used by Ecto migrations by default.

### ✅ Step 2: Database Schema (Completed)
**Goal:** Define the data model and prepare the database.

1.  **Schema Definition**:
    *   Created `src/services/report/lib/report/report.ex`.
    *   Defined `Report.Report` schema mapping to `reports` table.
    *   Included fields: `reporter_id` (UUID), `privacy_level`, `category`, `content`, `location`, `status`, `escalated_at`, etc.
    *   Set timestamps to use `type: :utc_datetime` and mapped `inserted_at` to `created_at` (to match `init.sql`).

2.  **Migration Creation**:
    *   Generated migration file via Docker:
        ```bash
        docker compose exec report-service mix ecto.gen.migration create_reports
        ```
    *   Populated migration file (`..._create_reports.exs`) with table definition and indexes:
        *   Index on `(authority_department, status)` for filtering.
        *   Index on `(created_at, status)` for escalation worker (finding stale reports).

3.  **Migration Strategy**:
    *   Discovered `reports` table already existed via `init.sql` (from Engineer A).
    *   **Decision**: Kept the Ecto migration file for documentation/testing purposes but **skipped execution** (`mix ecto.migrate`) to avoid "Relation already exists" error. The existing table structure from `init.sql` matches the Ecto schema.

### 🚧 Step 3: Core Logic & API (Next)
**Goal:** Implement CRUD operations and HTTP Endpoints.

*   [ ] Create Context Module (`Report.Reports`).
*   [ ] Implement Controller (`ReportController`).
*   [ ] Configure Router.

### ⏳ Step 4: Escalation Worker (Pending)
**Goal:** Implement GenServer for auto-escalation.

### ⏳ Step 5: Observability & NATS (Pending)
**Goal:** Wire up Prometheus and NATS publishing.
