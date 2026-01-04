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

### ✅ Step 3: Core Logic & API (Completed)
**Goal:** Implement CRUD operations and HTTP Endpoints.

1.  **Context Module** (`Report.Reports`):
    *   ✅ `create_report/1` - Creates a new report
        ```elixir
        def create_report(attrs \\ %{}) do
          %Report{}
          |> Report.changeset(attrs)
          |> Repo.insert()
        end
        ```
        *   Returns `{:ok, report}` on success or `{:error, changeset}` on validation failure.
        *   Leverages Ecto changesets for automatic field validation and type coercion.
        *   Fields like `reporter_id` (UUID) will be validated before insertion.

    *   ✅ `list_reports/0` - Lists all reports ordered by created_at desc
        ```elixir
        def list_reports do
          Report
          |> order_by([desc: :created_at])
          |> Repo.all()
        end
        ```
        *   Returns reports in reverse chronological order (newest first).
        *   Used by public API to show latest reports.

    *   ✅ `list_by_department/1` - Filters reports by authority_department
        ```elixir
        def list_by_department(department) do
          from(r in Report,
            where: r.authority_department == ^department,
            order_by: [desc: r.created_at]
          )
          |> Repo.all()
        end
        ```
        *   **Key for NFR-S1 (Department Isolation)**: Only returns reports matching authority_department.
        *   Uses parameterized query `^department` to prevent SQL injection.
        *   Authorities can only see reports relevant to their jurisdiction.

    *   ✅ `get_report!/1` - Gets a single report by ID
        *   Raises `Ecto.NoResultsError` if report not found (handled by FallbackController).
        *   Used by `GET /api/reports/:id` endpoint.

    *   ✅ `list_stale_reports/1` - Finds reports older than cutoff for escalation
        ```elixir
        def list_stale_reports(cutoff_time) do
          from(r in Report,
            where: r.status == "submitted" and r.created_at < ^cutoff_time,
            order_by: [asc: r.created_at]
          )
          |> Repo.all()
        end
        ```
        *   **Key for FR-8 (Auto-Escalation)**: Queries reports with status "submitted" older than cutoff.
        *   Index on `(created_at, status)` optimizes this query (from migration).
        *   Used by Escalation Worker every 10 seconds.

    *   ✅ `escalate_report/1` - Updates status to "escalated" with timestamp
        ```elixir
        def escalate_report(%Report{} = report) do
          report
          |> Report.changeset(%{
            status: "escalated",
            escalated_at: DateTime.utc_now() |> DateTime.truncate(:second)
          })
          |> Repo.update()
        end
        ```
        *   Sets `escalated_at` to current UTC time (truncated to seconds for DB compatibility).
        *   Changes status from "submitted" to "escalated".
        *   Enables tracking of escalation time for SLA metrics.

2.  **Controller** (`ReportWeb.ReportController`):
    *   ✅ Pattern-matched `index/2` for department filtering:
        ```elixir
        def index(conn, %{"department" => department}) do
          reports = Reports.list_by_department(department)
          render(conn, :index, reports: reports)
        end

        def index(conn, _params) do
          reports = Reports.list_reports()
          render(conn, :index, reports: reports)
        end
        ```
        *   Phoenix allows multiple function clauses with pattern matching.
        *   First clause matches requests with `?department=X` query param.
        *   Second clause (fallback) handles requests without department filter.
        *   **Implements FR-5 (Authority Isolation)**: Authorities can query `GET /api/reports?department=kebersihan` to see only their reports.

    *   ✅ `create/2` - Creates report with status 201 Created:
        ```elixir
        def create(conn, %{"report" => report_params}) do
          with {:ok, %Report{} = report} <- Reports.create_report(report_params) do
            conn
            |> put_status(:created)
            |> render(:show, report: report)
          end
        end
        ```
        *   Uses `with` statement for composable error handling.
        *   Sets HTTP status to 201 (Created) on success.
        *   On validation error (`{:error, changeset}`), falls through to `FallbackController`.
        *   **TODO for Step 5**: Add NATS publish here to notify Anonymizer of report creation.

    *   ✅ `show/2` - Retrieves single report:
        ```elixir
        def show(conn, %{"id" => id}) do
          report = Reports.get_report!(id)
          render(conn, :show, report: report)
        end
        ```
        *   If report not found, `Ecto.NoResultsError` is raised → caught by FallbackController → returns 404.

    *   ✅ **Error Handling via `action_fallback`**:
        ```elixir
        action_fallback ReportWeb.FallbackController
        ```
        *   Tells Phoenix to route all unhandled errors to `FallbackController.call/2`.
        *   Examples:
          - `{:error, changeset}` → HTTP 422 with validation errors
          - `Ecto.NoResultsError` → HTTP 404 (not found)
        *   Eliminates repetitive error handling code in each action.

3.  **Error Handling & Validation** (`ReportWeb.FallbackController`):
    *   ✅ Catches `Ecto.Changeset` errors:
        ```elixir
        def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
          conn
          |> put_status(:unprocessable_entity)
          |> put_view(json: ReportWeb.ChangesetJSON)
          |> render(:error, changeset: changeset)
        end
        ```
        *   Returns HTTP 422 (Unprocessable Entity) for validation errors.
        *   Example: Missing required field `category` → `ChangesetJSON` formats error response.

    *   ✅ Catches `Ecto.NoResultsError` and other exceptions:
        ```elixir
        def call(conn, {:error, :not_found}) do
          conn
          |> put_status(:not_found)
          |> put_view(json: ReportWeb.ErrorJSON)
          |> render(:"404")
        end
        ```
        *   Returns HTTP 404 (Not Found) when report doesn't exist.

4.  **JSON Serialization** (`ReportWeb.ReportJSON` & `ReportWeb.ChangesetJSON`):
    *   ✅ **ReportJSON** - Converts `Report` struct to JSON:
        ```elixir
        defp data(%Report{} = report) do
          %{
            id: report.id,
            reporter_id: report.reporter_id,
            privacy_level: report.privacy_level,
            category: report.category,
            content: report.content,
            location: report.location,
            status: report.status,
            authority_department: report.authority_department,
            created_at: report.created_at,
            escalated_at: report.escalated_at
          }
        end
        ```
        *   Wraps results in `%{data: ...}` for JSON:API compatibility.
        *   Lists only relevant fields (excludes internal Ecto metadata).
        *   `reporter_id` will be `nil` after anonymization (proving PII scrubbing works).

    *   ✅ **ChangesetJSON** - Formats validation error messages:
        ```elixir
        def error(%{changeset: changeset}) do
          %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
        end
        ```
        *   Returns errors grouped by field: `{"category": ["can't be blank"]}`
        *   Enables client-side form validation feedback.

5.  **Health Check Endpoint** (`ReportWeb.HealthController`):
    *   ✅ Created for observability and service discovery:
        ```elixir
        def index(conn, _params) do
          db_status =
            try do
              Report.Repo.query!("SELECT 1")
              "connected"
            rescue
              _ -> "disconnected"
            end

          response = %{
            status: "ok",
            service: "report-service",
            database: db_status,
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
          }

          if db_status == "connected" do
            json(conn, response)
          else
            conn
            |> put_status(:service_unavailable)
            |> json(response)
          end
        end
        ```
        *   **Implements NFR-R1 (Fault Isolation)**: Enables orchestrator to detect service health.
        *   Returns HTTP 200 if healthy, HTTP 503 if DB unavailable.
        *   Docker health checks will use this endpoint.
        *   Crucial for Docker Compose restart policies and load balancer routing.

6.  **Router Configuration** (`ReportWeb.Router`):
    *   ✅ Organized routes with clear pipelines:
        ```elixir
        # Health check (outside API pipeline for quick availability)
        scope "/", ReportWeb do
          get "/health", HealthController, :index
        end

        # API routes
        scope "/api", ReportWeb do
          pipe_through :api
          resources "/reports", ReportController, only: [:index, :create, :show]
        end
        ```
        *   **Health endpoint separate**: No JSON parsing required, faster response.
        *   **`resources` macro**: Generates standard RESTful routes:
          - `GET /api/reports` → `index/2`
          - `POST /api/reports` → `create/2`
          - `GET /api/reports/:id` → `show/2`
        *   **`:only` option**: Restricts to read/create operations (no delete/update).

    *   ✅ API Pipeline configuration:
        ```elixir
        pipeline :api do
          plug :accepts, ["json"]
        end
        ```
        *   `plug :accepts, ["json"]`: Validates `Accept: application/json` header.
        *   Returns HTTP 406 (Not Acceptable) for non-JSON requests.

### ⏳ Step 4: Escalation Worker (Pending)
**Goal:** Implement GenServer for auto-escalation.

### ⏳ Step 5: Observability & NATS (Pending)
**Goal:** Wire up Prometheus and NATS publishing.
