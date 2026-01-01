# JagaWarga PoC: REVISED 4-Day Implementation Sprint
**Project Canvas & Execution Plan - Option 1 (Complete Security + Escalation)**

---

## 📋 Executive Summary

**Objective**: Deliver a production-grade Proof-of-Concept demonstrating anonymous reporting with auto-escalation, complete encryption, and full observability in a distributed microservices architecture.

**Timeline**: 4 Days (Jan 1 - Jan 4, 2026)  
**Team Size**: 3 Engineers  
**Deadline**: Jan 2, 2026 23:59 WIB (Assignment Due Date)

---

## 🎯 PoC Scope Definition (FINAL)

### **Functional Requirements Implemented**
✅ **FR-1**: Anonymous report submission with PII scrubbing  
✅ **FR-5**: Authority access with department isolation  
✅ **FR-8**: Auto-escalation worker for stale reports (30s timeout)

### **Non-Functional Requirements Proven**
✅ **NFR-R1**: Fault isolation (service independence)  
✅ **NFR-SC1**: Scalability via NATS message buffering  
✅ **NFR-S4**: Data privacy through PII scrubbing  
✅ **NFR-S5**: Encryption in-transit (TLS) and at-rest (CockroachDB)  
✅ **NFR-O1**: System monitoring via Grafana dashboards

### **What We Will NOT Implement**
❌ Public report feed with upvotes (FR-3)  
❌ Advanced analytics for authorities (FR-6)  
❌ Real external system integration (FR-7) - mocked webhook only  
❌ Notification service (FR-4) - logged to console instead  
❌ Multimedia file uploads - text reports only  
❌ Production-grade auth (JWT validation against seeded DB is sufficient)

### **Success Criteria**
1. Citizen submits anonymous report via HTTPS → PII scrubbed → Saved to encrypted DB
2. Authority queries reports filtered by department → Only sees authorized data
3. After 30s timeout, escalation worker changes status to "escalated"
4. Grafana dashboard shows: request rate, latency, NATS throughput, service health
5. System survives killing any one service (fault isolation proof)
6. All data in-transit uses TLS, all data at-rest is encrypted

---

## 👥 Team Structure & Role Assignment

### **Engineer A: Infrastructure & Security Lead**
**Primary Responsibilities**:
- CockroachDB schema design & encryption-at-rest
- NATS JetStream stream configuration
- Traefik TLS setup (self-signed certificates)
- Prometheus + Grafana observability stack
- Docker Compose orchestration & health checks

**Key Deliverables**:
- `init.sql` with complete schema + indexes
- `nats-setup.sh` stream initialization script
- TLS certificates and Traefik configuration
- Grafana dashboard JSON export (4 panels minimum)
- Seed data script (100 fake citizens, 5 authorities)

**Daily Checkpoints**:
- Day 1: DB schema applied, TLS working, NATS streams created
- Day 2: Prometheus scraping all services, Grafana connected
- Day 3: Complete dashboard with live metrics
- Day 4: Infrastructure demo ready for video

---

### **Engineer B: Backend Services Lead (Elixir/Phoenix)**
**Primary Responsibilities**:
- Report Service (Phoenix/Ecto) with CRUD operations
- Escalation Worker (GenServer) with Quantum scheduler
- NATS event publisher integration
- Database connection pooling & query optimization
- Prometheus metrics exporter (`:telemetry` + `:prom_ex`)

**Key Deliverables**:
- `/src/services/report/` complete implementation
- `/src/services/escalation/` worker service
- API endpoints: `POST /reports`, `GET /reports?department=X`
- Background job: Every 10s, escalate reports older than 30s
- Health check endpoint: `GET /health`
- Metrics endpoint: `GET /metrics` (Prometheus format)

**Daily Checkpoints**:
- Day 1: Phoenix app skeleton, Ecto schema, basic CRUD
- Day 2: NATS publisher working, escalation worker scheduled
- Day 3: Department isolation tested, metrics exported
- Day 4: Code review complete, ready for demo

---

### **Engineer C: Edge Services Lead (Bun/ElysiaJS)**
**Primary Responsibilities**:
- Identity Service (JWT validation mock)
- Anonymizer Service (PII scrubbing pipeline)
- NATS publisher for report.created events
- Request/response logging & error handling
- Integration testing scripts

**Key Deliverables**:
- `/src/services/identity/` complete implementation
- `/src/services/anonymizer/` complete implementation
- API endpoints: `POST /identity/validate`, `POST /anonymizer/scrub`
- NATS publish on successful report creation
- Health check endpoints for both services
- Load test script: Submit 100 anonymous reports

**Daily Checkpoints**:
- Day 1: Bun projects initialized, DB connections working
- Day 2: PII scrubbing tested, end-to-end flow complete
- Day 3: Load testing done, error handling robust
- Day 4: API examples documented, demo script ready

---

## 📅 Day-by-Day Sprint Plan

### **Day 1 (Jan 1): Foundation & Security Setup**

#### Morning Session (08:00 - 12:00)

**All Team**:
- [ ] 08:00-08:30: Kickoff meeting (review canvas, sync on goals)
- [ ] 08:30-09:00: Setup local repos, create feature branches

**Engineer A**:
- [ ] Design CockroachDB schema (users, reports, authorities)
- [ ] Create `init.sql` with:
  - Users table (id, nik, name)
  - Authorities table (department, name)
  - Reports table (with privacy_level, authority_department, status, escalated_at)
  - Indexes on `(authority_department, status)` and `(created_at, status)`
- [ ] Generate TLS certificates:
  ```bash
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout certs/traefik.key -out certs/traefik.crt -days 365 \
    -subj "/CN=jagawarga.local"
  ```
- [ ] Generate DB encryption key:
  ```bash
  head -c 32 /dev/urandom | base64 > certs/aes-256.key
  ```

**Engineer B**:
- [ ] Initialize Phoenix project: `mix phx.new report --no-html --no-assets --binary-id`
- [ ] Configure Ecto for CockroachDB:
  ```elixir
  # config/dev.exs
  config :report, Report.Repo,
    adapter: Ecto.Adapters.Postgres,
    username: "root",
    password: "",
    hostname: "localhost",
    port: 26257,
    database: "defaultdb",
    pool_size: 10,
    ssl: false
  ```
- [ ] Create Ecto schema for Report:
  ```elixir
  schema "reports" do
    field :reporter_id, :binary_id
    field :privacy_level, :string
    field :category, :string
    field :content, :string
    field :status, :string, default: "submitted"
    field :authority_department, :string
    field :escalated_at, :utc_datetime
    timestamps()
  end
  ```

**Engineer C**:
- [ ] Initialize Bun project (Identity Service):
  ```bash
  mkdir -p src/services/identity && cd src/services/identity
  bun init -y
  bun add elysia @elysiajs/jwt postgres
  ```
- [ ] Initialize Bun project (Anonymizer Service):
  ```bash
  mkdir -p src/services/anonymizer && cd src/services/anonymizer
  bun init -y
  bun add elysia nats postgres
  ```
- [ ] Create database connection pool utility:
  ```typescript
  // shared/db.ts
  import postgres from 'postgres';
  export const sql = postgres({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '26257'),
    database: process.env.DB_NAME || 'defaultdb',
    username: 'root',
    ssl: false
  });
  ```

#### Afternoon Session (13:00 - 18:00)

**Engineer A**:
- [ ] Update `compose.yml` with TLS and encryption:
  ```yaml
  db:
    command: >
      start-single-node --insecure
      --enterprise-encryption=path=/cockroach/cockroach-data,key=/certs/aes-256.key
    volumes:
      - "./certs/aes-256.key:/certs/aes-256.key:ro"
  
  gateway:
    command:
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--providers.docker=true"
      - "--providers.file.filename=/certs/tls.yml"
    volumes:
      - "./certs:/certs:ro"
  ```
- [ ] Create NATS stream setup script:
  ```bash
  #!/bin/bash
  # nats-setup.sh
  nats stream add REPORTS \
    --subjects "report.*" \
    --storage file \
    --retention limits \
    --max-msgs 10000 \
    --max-age 7d
  ```
- [ ] Create seed data script (`seed.sql`):
  ```sql
  INSERT INTO users (nik, name) VALUES
    ('3201234567890001', 'Ahmad Rizki'),
    ('3201234567890002', 'Siti Nurhaliza'),
    -- ... 98 more fake citizens
  
  INSERT INTO authorities (department, name) VALUES
    ('kebersihan', 'Dinas Kebersihan Kota'),
    ('kesehatan', 'Dinas Kesehatan Kota'),
    ('infrastruktur', 'Dinas Pekerjaan Umum'),
    ('keamanan', 'Polisi Kota'),
    ('lingkungan', 'Badan Lingkungan Hidup');
  ```

**Engineer B**:
- [ ] Implement Report CRUD endpoints:
  ```elixir
  # lib/report_web/controllers/report_controller.ex
  def create(conn, params) do
    case Reports.create_report(params) do
      {:ok, report} ->
        # Publish NATS event
        Gnat.pub(:gnat, "report.created", Jason.encode!(%{
          report_id: report.id,
          category: report.category,
          department: report.authority_department
        }))
        
        json(conn, %{success: true, report: report})
      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: changeset})
    end
  end
  
  def index(conn, %{"department" => dept}) do
    reports = Reports.list_by_department(dept)
    json(conn, reports)
  end
  ```
- [ ] Add NATS dependency:
  ```elixir
  # mix.exs
  {:gnat, "~> 1.8"},
  {:jason, "~> 1.4"}
  ```

**Engineer C**:
- [ ] Implement Identity Service validation:
  ```typescript
  // identity/index.ts
  import { Elysia } from 'elysia';
  import { jwt } from '@elysiajs/jwt';
  import { sql } from '../shared/db';
  
  const app = new Elysia()
    .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET || 'dev-secret' }))
    .post('/validate', async ({ body, jwt }) => {
      const user = await sql`
        SELECT id, name FROM users WHERE nik = ${body.nik}
      `;
      
      if (!user.length) {
        return { valid: false, error: 'NIK not found' };
      }
      
      const token = await jwt.sign({
        user_id: user[0].id,
        nik: body.nik,
        name: user[0].name
      });
      
      return { valid: true, token, user: user[0] };
    })
    .get('/health', () => ({ status: 'ok' }))
    .listen(3001);
  
  console.log('Identity service running on :3001');
  ```

- [ ] Implement Anonymizer Service skeleton:
  ```typescript
  // anonymizer/index.ts
  import { Elysia } from 'elysia';
  import { connect } from 'nats';
  
  const nc = await connect({ 
    servers: process.env.NATS_URL || 'nats://localhost:4222' 
  });
  
  const app = new Elysia()
    .post('/scrub', async ({ body }) => {
      // PII scrubbing logic
      const { reporter_id, ip_address, ...cleanData } = body;
      
      const scrubbedReport = {
        ...cleanData,
        reporter_id: null,
        privacy_level: 'anonymous'
      };
      
      // Forward to Report Service
      const response = await fetch('http://report-service:4000/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrubbedReport)
      });
      
      if (response.ok) {
        const report = await response.json();
        return { success: true, report_id: report.id };
      }
      
      return { success: false, error: 'Failed to create report' };
    })
    .get('/health', () => ({ status: 'ok' }))
    .listen(3002);
  ```

#### Evening Checkpoint (18:00)
**Integration Test**:
- [ ] `docker-compose up -d` - All services start without errors
- [ ] CockroachDB accepts connections with encryption enabled
- [ ] Traefik serves HTTPS on port 443 (self-signed warning is OK)
- [ ] NATS streams created successfully
- [ ] All services respond to health checks

---

### **Day 2 (Jan 2): Core Logic & Escalation**

#### Morning Session (08:00 - 12:00)

**Engineer A**:
- [ ] Setup Prometheus configuration:
  ```yaml
  # prometheus.yml
  global:
    scrape_interval: 15s
  
  scrape_configs:
    - job_name: 'report-service'
      static_configs:
        - targets: ['report-service:4000']
    
    - job_name: 'cockroachdb'
      static_configs:
        - targets: ['db:8080']
    
    - job_name: 'nats'
      static_configs:
        - targets: ['mb:7777']
  ```
- [ ] Add Prometheus & Grafana to `compose.yml`:
  ```yaml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - "./prometheus.yml:/etc/prometheus/prometheus.yml"
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
  ```

**Engineer B**:
- [ ] Create Escalation Worker service:
  ```elixir
  # lib/report/escalation_worker.ex
  defmodule Report.EscalationWorker do
    use GenServer
    require Logger
    
    @check_interval 10_000  # 10 seconds
    @stale_threshold 30     # 30 seconds
    
    def start_link(_) do
      GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
    end
    
    def init(state) do
      schedule_check()
      {:ok, state}
    end
    
    def handle_info(:check_stale, state) do
      threshold = DateTime.utc_now() |> DateTime.add(-@stale_threshold, :second)
      
      {count, _} = Report.Repo.update_all(
        from(r in Report.Report,
          where: r.status == "submitted" and r.created_at < ^threshold
        ),
        set: [status: "escalated", escalated_at: DateTime.utc_now()]
      )
      
      if count > 0 do
        Logger.warn("Escalated #{count} stale reports")
        
        # Publish NATS event
        Gnat.pub(:gnat, "report.escalated", Jason.encode!(%{
          count: count,
          timestamp: DateTime.utc_now()
        }))
      end
      
      schedule_check()
      {:noreply, state}
    end
    
    defp schedule_check do
      Process.send_after(self(), :check_stale, @check_interval)
    end
  end
  ```
- [ ] Add worker to supervision tree:
  ```elixir
  # lib/report/application.ex
  children = [
    Report.Repo,
    {Gnat.ConnectionSupervisor, 
     %{name: :gnat, backoff_period: 4_000, connection_settings: [
       %{host: System.get_env("NATS_URL", "localhost"), port: 4222}
     ]}},
    ReportWeb.Endpoint,
    Report.EscalationWorker  # Add this
  ]
  ```

**Engineer C**:
- [ ] Add NATS event publishing to Anonymizer:
  ```typescript
  // After successful report creation
  if (response.ok) {
    const report = await response.json();
    
    // Publish event to NATS
    nc.publish('report.created', JSON.stringify({
      report_id: report.id,
      category: scrubbedReport.category,
      department: scrubbedReport.authority_department,
      is_anonymous: true,
      timestamp: new Date().toISOString()
    }));
    
    return { success: true, report_id: report.id };
  }
  ```
- [ ] Create Dockerfiles for Bun services:
  ```dockerfile
  # identity/Dockerfile
  FROM oven/bun:1.0-alpine
  WORKDIR /app
  COPY package.json bun.lockb ./
  RUN bun install --production
  COPY . .
  EXPOSE 3001
  CMD ["bun", "run", "index.ts"]
  ```

#### Afternoon Session (13:00 - 18:00)

**Engineer A**:
- [ ] Create Grafana datasource config:
  ```yaml
  # grafana/datasources.yml
  apiVersion: 1
  datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus:9090
      isDefault: true
  ```
- [ ] Start building dashboard (basic layout)
- [ ] Add health check endpoints to compose.yml:
  ```yaml
  report-service:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
  ```

**Engineer B**:
- [ ] Add Prometheus metrics exporter:
  ```elixir
  # mix.exs
  {:telemetry_metrics, "~> 0.6"},
  {:telemetry_poller, "~> 1.0"},
  {:prom_ex, "~> 1.7"}
  ```
- [ ] Configure PromEx:
  ```elixir
  # lib/report/prom_ex.ex
  defmodule Report.PromEx do
    use PromEx, otp_app: :report
    
    @impl true
    def plugins do
      [
        PromEx.Plugins.Application,
        PromEx.Plugins.Beam,
        {PromEx.Plugins.Phoenix, router: ReportWeb.Router},
        PromEx.Plugins.Ecto
      ]
    end
  end
  ```
- [ ] Test escalation manually:
  ```bash
  # Submit report via API
  curl -X POST http://localhost:4000/reports \
    -H "Content-Type: application/json" \
    -d '{"category": "kebersihan", "content": "Test", 
         "authority_department": "kebersihan", "privacy_level": "public"}'
  
  # Wait 30 seconds
  sleep 30
  
  # Check status changed to escalated
  curl http://localhost:4000/reports
  ```

**Engineer C**:
- [ ] Implement department isolation in authority queries:
  ```typescript
  // Add to anonymizer for testing authority access
  app.get('/reports', async ({ query }) => {
    const { department } = query;
    
    const response = await fetch(
      `http://report-service:4000/reports?department=${department}`
    );
    
    return response.json();
  });
  ```
- [ ] Create integration test script:
  ```bash
  #!/bin/bash
  # test-anonymous-flow.sh
  
  echo "1. Validating user identity..."
  TOKEN=$(curl -s -X POST http://localhost:3001/validate \
    -H "Content-Type: application/json" \
    -d '{"nik": "3201234567890001"}' | jq -r '.token')
  
  echo "2. Submitting anonymous report..."
  REPORT_ID=$(curl -s -X POST https://localhost:443/anonymizer/scrub \
    -k -H "Content-Type: application/json" \
    -d '{"reporter_id": "user-123", "category": "kebersihan", 
         "content": "Sampah menumpuk di Jalan Sudirman", 
         "authority_department": "kebersihan"}' | jq -r '.report_id')
  
  echo "3. Verifying PII scrubbed..."
  docker exec jagawarga-db ./cockroach sql --insecure \
    -e "SELECT id, reporter_id, content FROM reports WHERE id='$REPORT_ID';"
  
  echo "4. Waiting for escalation (30s)..."
  sleep 30
  
  echo "5. Checking escalation status..."
  docker exec jagawarga-db ./cockroach sql --insecure \
    -e "SELECT id, status, escalated_at FROM reports WHERE id='$REPORT_ID';"
  ```

#### Evening Checkpoint (18:00)
**Integration Test**:
- [ ] Submit anonymous report via HTTPS → Verify reporter_id is NULL
- [ ] Query reports with department filter → Only see authorized data
- [ ] Wait 30s → Verify escalation worker changed status
- [ ] Check Prometheus targets → All services UP

---

### **Day 3 (Jan 3): Observability & Hardening**

#### Morning Session (08:00 - 12:00)

**Engineer A** (FOCUS: Grafana Dashboard):
- [ ] Build 4-panel Grafana dashboard:
  
  **Panel 1: Total Reports Created**
  ```
  Query: sum(increase(http_requests_total{endpoint="/reports",method="POST"}[5m]))
  Type: Stat
  ```
  
  **Panel 2: Service Response Time (p50, p95, p99)**
  ```
  Query: histogram_quantile(0.95, 
    rate(http_request_duration_seconds_bucket[5m]))
  Type: Graph
  ```
  
  **Panel 3: NATS Message Throughput**
  ```
  Query: rate(nats_server_sent_msgs[1m])
  Type: Graph
  ```
  
  **Panel 4: Service Health Status**
  ```
  Query: up{job=~".*-service"}
  Type: Stat (Thresholds: 1=green, 0=red)
  ```

- [ ] Export dashboard JSON to `/src/monitoring/grafana/dashboard.json`
- [ ] Add volume mount to compose.yml:
  ```yaml
  grafana:
    volumes:
      - "./src/monitoring/grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml"
      - "./src/monitoring/grafana/dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml"
      - "./src/monitoring/grafana:/var/lib/grafana/dashboards"
  ```

**Engineer B**:
- [ ] Add structured logging to Report Service:
  ```elixir
  # config/config.exs
  config :logger, :console,
    format: {Jason, :encode},
    metadata: [:request_id, :user_id, :department]
  ```
- [ ] Implement query optimization:
  ```elixir
  # Use select to limit columns
  def list_by_department(dept) do
    from(r in Report,
      where: r.authority_department == ^dept and r.status != "draft",
      select: %{id: r.id, category: r.category, content: r.content, 
                status: r.status, created_at: r.created_at}
    )
    |> Repo.all()
  end
  ```
- [ ] Add database connection pool metrics:
  ```elixir
  # Monitor Ecto pool usage
  :telemetry.attach(
    "repo-metrics",
    [:repo, :query],
    &handle_event/4,
    nil
  )
  ```

**Engineer C**:
- [ ] Add error handling & retries:
  ```typescript
  // Anonymizer with retry logic
  async function forwardToReportService(data: any, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('http://report-service:4000/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) return await response.json();
        
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
      }
    }
  }
  ```
- [ ] Add graceful shutdown:
  ```typescript
  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing connections...');
    await nc.drain();
    await sql.end();
    process.exit(0);
  });
  ```

#### Afternoon Session (13:00 - 18:00)

**All Team - Chaos Testing**:
- [ ] **Test 1: Database Failure Recovery**
  ```bash
  # Kill database
  docker stop jagawarga-db
  
  # Try to submit report (should fail gracefully)
  curl -X POST https://localhost/anonymizer/scrub ...
  
  # Restart database
  docker start jagawarga-db
  
  # Verify services reconnect automatically
  ```

- [ ] **Test 2: Report Service Failure (NFR-R1 Proof)**
  ```bash
  # Kill report service
  docker stop jagawarga-report
  
  # Verify other services still respond to health checks
  curl http://localhost:3001/health  # Identity: Should work
  curl http://localhost:3002/health  # Anonymizer: Should work
  
  # Restart report service
  docker start jagawarga-report
  ```

- [ ] **Test 3: NATS Message Durability**
  ```bash
  # Stop NATS
  docker stop jagawarga-mb
  
  # Services should handle gracefully (log error but not crash)
  
  # Restart NATS
  docker start jagawarga-mb
  
  # Submit report → Event should be published successfully
  ```

- [ ] **Test 4: Load Testing (NFR-SC1 Proof)**
  ```bash
  # Create load test script
  for i in {1..100}; do
    curl -X POST https://localhost/anonymizer/scrub \
      -k -H "Content-Type: application/json" \
      -d "{\"category\": \"kebersihan\", \"content\": \"Report $i\", 
           \"authority_department\": \"kebersihan\"}" &
  done
  wait
  
  # Verify all reports in database
  docker exec jagawarga-db ./cockroach sql --insecure \
    -e "SELECT count(*) FROM reports;"
  
  # Check Grafana for latency spikes
  ```

**Engineer A**:
- [ ] Document test results in `/docs/chaos-testing.md`
- [ ] Screenshot Grafana dashboard during load test
- [ ] Create architecture diagram with all components

**Engineer B**:
- [ ] Fix any issues found during chaos testing
- [ ] Add database connection retry logic:
  ```elixir
  # config/config.exs
  config :report, Report.Repo,
    queue_target: 50,
    queue_interval: 1000,
    timeout: 15000
  ```

**Engineer C**:
- [ ] Document API endpoints in `/docs/API.md`
- [ ] Create example curl commands
- [ ] Prepare demo script for video

#### Evening Checkpoint (18:00)
**Final Integration Test**:
- [ ] Full flow: Identity → Anonymizer → Report → Escalation
- [ ] All chaos tests passed
- [ ] Grafana dashboard showing live metrics
- [ ] 100 reports load tested successfully
- [ ] All services survive individual failures

---

### **Day 4 (Jan 4): Documentation & Video Demo**

#### Morning Session (08:00 - 12:00)

**Engineer A**:
- [ ] Write comprehensive README.md:
  ```markdown
  # JagaWarga PoC
  
  ## Quick Start
  ```bash
  # Clone repository
  git clone https://github.com/anomali-nangor/jagawarga-poc.git
  cd jagawarga-poc
  
  # Generate certificates (first time only)
  make setup-certs
  
  # Start all services
  make up
  
  # Verify services
  make health-check
  ```
  
  ## Architecture
  [Include diagram]
  
  ## Testing
  ```bash
  # Run integration test
  ./scripts/test-anonymous-flow.sh
  
  # Run load test
  ./scripts/load-test.sh
  ```
  ```
- [ ] Create setup script:
  ```bash
  #!/bin/bash
  # setup-certs.sh
  mkdir -p certs
  
  # TLS certificate
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout certs/traefik.key -out certs/traefik.crt -days 365 \
    -subj "/CN=jagawarga.local"
  
  # DB encryption key
  head -c 32 /dev/urandom | base64 > certs/aes-256.key
  
  echo "✅ Certificates generated"
  ```

**Engineer B**:
- [ ] Write technical documentation in `/docs/IMPLEMENTATION.md`:
  - Escalation worker logic explanation
  - Database schema rationale
  - Query optimization notes
- [ ] Create code comments for key sections
- [ ] Prepare code walkthrough for video

**Engineer C**:
- [ ] Document anonymization algorithm in `/docs/ANONYMIZATION.md`
- [ ] Create API usage examples
- [ ] Prepare terminal recordings for demo

#### Afternoon Session (13:00 - 18:00)

**All Team - Video Production (8-10 minutes target)**

**Recording Setup**:
- [ ] Use OBS Studio or similar (record at 1080p)
- [ ] Prepare clean terminal windows
- [ ] Have Grafana dashboard open
- [ ] Fresh database (clear old test data)

**Video Outline & Script**:

**[0:00-1:00] Introduction & Architecture**
- **Speaker**: Engineer A
- **Content**:
  - "Hi, we're Team Anomali Nangor presenting JagaWarga"
  - Show architecture diagram
  - Explain: "7 microservices, fully encrypted, fault-tolerant"
  - Point to each component on diagram

**[1:00-1:30] System Startup**
- **Speaker**: Engineer A
- **Terminal**:
  ```bash
  # Show clean start
  make down  # Stop any running services
  make up    # Start fresh
  docker ps  # Show all containers running
  ```
- **Voiceover**: "All services start in 30 seconds with encryption enabled"

**[1:30-3:30] Anonymous Report Submission (Core Demo)**
- **Speaker**: Engineer C
- **Terminal 1 - Submit Report**:
  ```bash
  # Step 1: Validate identity (show this generates JWT)
  curl -X POST http://localhost:3001/validate \
    -H "Content-Type: application/json" \
    -d '{"nik": "3201234567890001"}' | jq
  
  # Step 2: Submit anonymous report via HTTPS
  curl -X POST https://localhost:443/anonymizer/scrub \
    -k -H "Content-Type: application/json" \
    -d '{
      "reporter_id": "user-abc-123",
      "category": "kebersihan",
      "content": "Sampah menumpuk di Jalan Ganesha",
      "authority_department": "kebersihan",
      "privacy_level": "anonymous"
    }' | jq
  ```
- **Terminal 2 - Verify in Database**:
  ```bash
  # Show reporter_id is NULL (PII scrubbed)
  docker exec jagawarga-db ./cockroach sql --insecure \
    -e "SELECT id, reporter_id, privacy_level, content, created_at 
        FROM reports ORDER BY created_at DESC LIMIT 1;"
  ```
- **Voiceover**: "Notice reporter_id is NULL - identity completely scrubbed by Anonymizer"

**[3:30-4:30] Department Isolation (NFR-S1)**
- **Speaker**: Engineer B
- **Terminal**:
  ```bash
  # Department A can see their reports
  curl "http://localhost:4000/reports?department=kebersihan" | jq
  
  # Department B cannot see Department A's reports
  curl "http://localhost:4000/reports?department=kesehatan" | jq
  ```
- **Voiceover**: "Each authority only sees reports in their jurisdiction"

**[4:30-6:00] Auto-Escalation Demo (FR-8)**
- **Speaker**: Engineer B
- **Split Screen**:
  - Left: Escalation worker logs (`docker logs -f jagawarga-escalation`)
  - Right: Database watch command
    ```bash
    watch -n 2 'docker exec jagawarga-db ./cockroach sql --insecure \
      -e "SELECT id, status, created_at, escalated_at FROM reports 
          ORDER BY created_at DESC LIMIT 3;"'
    ```
- **Action**: Wait 30 seconds, show status change to "escalated"
- **Voiceover**: "Worker detected stale report and escalated automatically"

**[6:00-7:00] Observability Dashboard (NFR-O1)**
- **Speaker**: Engineer A
- **Browser**: Open Grafana at http://localhost:3000
- **Show**:
  - Panel 1: Total reports counter going up
  - Panel 2: Response time histogram
  - Panel 3: NATS message flow
  - Panel 4: All services green (healthy)
- **Voiceover**: "Full visibility into system health and performance"

**[7:00-8:00] Fault Isolation Test (NFR-R1)**
- **Speaker**: Engineer A
- **Terminal**:
  ```bash
  # Kill report service
  docker stop jagawarga-report
  
  # Try to submit report (should fail gracefully)
  curl -X POST https://localhost/anonymizer/scrub ...
  # Shows error but other services still work
  
  # Check other services still healthy
  curl http://localhost:3001/health  # ✅
  curl http://localhost:3002/health  # ✅
  
  # Restart service
  docker start jagawarga-report
  
  # Submit report again (now works)
  curl -X POST https://localhost/anonymizer/scrub ...
  ```
- **Voiceover**: "Service failure is isolated - system self-heals"

**[8:00-9:00] Security Features (NFR-S5)**
- **Speaker**: Engineer C
- **Browser**: Show HTTPS padlock in browser
- **Terminal**:
  ```bash
  # Show TLS certificate
  openssl s_client -connect localhost:443 -showcerts
  
  # Show DB encryption enabled
  docker exec jagawarga-db ./cockroach sql --insecure \
    -e "SHOW ALL CLUSTER SETTINGS;" | grep encryption
  ```
- **Voiceover**: "Data encrypted in-transit via TLS and at-rest in CockroachDB"

**[9:00-10:00] Code Walkthrough & Conclusion**
- **Speakers**: All three (split screen with each person's IDE)
- **Engineer C**: Show PII scrubbing function (15s)
  ```typescript
  const { reporter_id, ip_address, ...cleanData } = body;
  return { ...cleanData, reporter_id: null };
  ```
- **Engineer B**: Show GenServer escalation logic (15s)
  ```elixir
  threshold = DateTime.utc_now() |> DateTime.add(-30, :second)
  Repo.update_all(from(r in Report, where: r.created_at < ^threshold), ...)
  ```
- **Engineer A**: Show Traefik TLS config (15s)
- **All Together**: "This PoC proves our distributed architecture handles security, scalability, and reliability. Thank you!"

**Post-Recording**:
- [ ] Edit video (add captions if needed)
- [ ] Export as MP4 (1080p, H.264)
- [ ] Upload to YouTube (unlisted link)
- [ ] Add link to README.md

---

#### Final Push (18:00 - 22:00)

**Engineer A**:
- [ ] Compile final document (merge all sections)
- [ ] Update contribution matrix:
  ```markdown
  | Member | Contribution | Percentage |
  |--------|-------------|------------|
  | Rhio   | Infrastructure, Security, Observability | 33% |
  | Frederiko | Backend Services, Escalation Worker | 34% |
  | Naufarrel | Edge Services, Testing, Integration | 33% |
  ```
- [ ] Generate PDF from LaTeX/Markdown
- [ ] Verify all links work

**Engineer B**:
- [ ] Final code review (check for hardcoded secrets)
- [ ] Run linter on Elixir code: `mix format`
- [ ] Verify all migrations are idempotent
- [ ] Tag release: `git tag -a v1.0-poc -m "PoC Submission"`

**Engineer C**:
- [ ] Run linter on TypeScript: `bun run biome check`
- [ ] Verify Dockerfiles are optimized
- [ ] Test clean deployment on fresh VM/machine
- [ ] Push final commit with clean history

**All Team**:
- [ ] 20:00 - Final review meeting
- [ ] 21:00 - Submit to Google Form
- [ ] 22:00 - Celebrate! 🎉

---

## 🛠️ Technical Implementation Reference

### **CockroachDB Schema (Complete)**

```sql
-- /src/infras/db/init.sql
CREATE DATABASE IF NOT EXISTS jagawarga;
USE jagawarga;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    privacy_level VARCHAR(10) NOT NULL CHECK (privacy_level IN ('public', 'private', 'anonymous')),
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved', 'escalated')),
    authority_department VARCHAR(50) REFERENCES authorities(department),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    escalated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Indexes for performance
    INDEX idx_reports_department_status (authority_department, status),
    INDEX idx_reports_stale (created_at, status) WHERE status = 'submitted',
    INDEX idx_reports_privacy (privacy_level) WHERE privacy_level = 'public'
);

-- Seed authorities
INSERT INTO authorities (department, name, email) VALUES
    ('kebersihan', 'Dinas Kebersihan Kota Bandung', 'kebersihan@bandung.go.id'),
    ('kesehatan', 'Dinas Kesehatan Kota Bandung', 'kesehatan@bandung.go.id'),
    ('infrastruktur', 'Dinas Pekerjaan Umum Bandung', 'pu@bandung.go.id'),
    ('keamanan', 'Kepolisian Resor Kota Bandung', 'polresta@bandung.go.id'),
    ('lingkungan', 'Badan Lingkungan Hidup Bandung', 'blh@bandung.go.id');

-- Seed users (100 fake citizens)
INSERT INTO users (nik, name) VALUES
    ('3201234567890001', 'Ahmad Rizki Pratama'),
    ('3201234567890002', 'Siti Nurhaliza'),
    ('3201234567890003', 'Budi Santoso'),
    ('3201234567890004', 'Dewi Lestari'),
    ('3201234567890005', 'Eko Prasetyo');
    -- Add 95 more...
```

---

### **NATS Configuration (Complete)**

```bash
#!/bin/bash
# /src/infras/message-broker/nats-setup.sh

echo "Setting up NATS JetStream..."

# Create REPORTS stream
nats stream add REPORTS \
  --subjects "report.*" \
  --storage file \
  --retention limits \
  --max-msgs 10000 \
  --max-bytes 10GB \
  --max-age 7d \
  --replicas 1 \
  --discard old

# Create consumer for escalation worker
nats consumer add REPORTS escalation_worker \
  --pull \
  --deliver all \
  --ack-explicit \
  --max-deliver 3 \
  --max-pending 10 \
  --replay instant

echo "✅ NATS streams configured"
```

---

### **Traefik Configuration (Complete)**

```yaml
# /src/infras/gateway/tls.yml
tls:
  certificates:
    - certFile: /certs/traefik.crt
      keyFile: /certs/traefik.key

# /src/infras/gateway/dynamic.yml
http:
  routers:
    anonymizer:
      rule: "PathPrefix(`/anonymizer`)"
      service: anonymizer-service
      entryPoints:
        - websecure
      tls: {}
    
    identity:
      rule: "PathPrefix(`/identity`)"
      service: identity-service
      entryPoints:
        - websecure
      tls: {}
    
    report:
      rule: "PathPrefix(`/reports`)"
      service: report-service
      entryPoints:
        - websecure
      tls: {}
  
  services:
    anonymizer-service:
      loadBalancer:
        servers:
          - url: "http://anonymizer-service:3002"
    
    identity-service:
      loadBalancer:
        servers:
          - url: "http://identity-service:3001"
    
    report-service:
      loadBalancer:
        servers:
          - url: "http://report-service:4000"
  
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 200
```

---

### **Docker Compose (Final Version)**

```yaml
version: '3.8'

services:
  db:
    image: cockroachdb/cockroach:v23.1.10
    container_name: jagawarga-db
    command: >
      start-single-node --insecure
      --enterprise-encryption=path=/cockroach/cockroach-data,key=/certs/aes-256.key
    ports:
      - "26257:26257"
      - "8080:8080"
    volumes:
      - db-data:/cockroach/cockroach-data
      - ./certs/aes-256.key:/certs/aes-256.key:ro
      - ./src/infras/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - jagawarga-net
    healthcheck:
      test: ["CMD", "/cockroach/cockroach", "node", "status", "--insecure"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  mb:
    image: nats:2.10-alpine
    container_name: jagawarga-mb
    command: "-js -m 8222"
    ports:
      - "4222:4222"
      - "8222:8222"
    networks:
      - jagawarga-net
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "4222"]
      interval: 5s
      timeout: 3s
      retries: 3
  
  gateway:
    image: traefik:2.10
    container_name: jagawarga-gateway
    ports:
      - "80:80"
      - "443:443"
      - "8081:8080"  # Dashboard
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--metrics.prometheus=true"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./certs:/certs:ro"
      - "./src/infras/gateway:/etc/traefik/dynamic:ro"
    networks:
      - jagawarga-net
  
  identity-service:
    build: "./src/services/identity/"
    container_name: jagawarga-identity
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DB_HOST=db
      - DB_PORT=26257
      - DB_NAME=jagawarga
      - JWT_SECRET=dev-secret-key-change-in-prod
    networks:
      - jagawarga-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3
  
  anonymizer-service:
    build: "./src/services/anonymizer/"
    container_name: jagawarga-anonymizer
    depends_on:
      db:
        condition: service_healthy
      mb:
        condition: service_healthy
    environment:
      - DB_HOST=db
      - DB_PORT=26257
      - DB_NAME=jagawarga
      - NATS_URL=nats://mb:4222
    networks:
      - jagawarga-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 10s
      timeout: 5s
      retries: 3
  
  report-service:
    build: "./src/services/report/"
    container_name: jagawarga-report
    depends_on:
      db:
        condition: service_healthy
      mb:
        condition: service_healthy
    environment:
      - DB_HOST=db
      - DB_PORT=26257
      - DB_NAME=jagawarga
      - NATS_URL=nats://mb:4222
      - SECRET_KEY_BASE=super-secret-key-base-change-in-prod
    ports:
      - "4000:4000"
    networks:
      - jagawarga-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
  
  prometheus:
    image: prom/prometheus:latest
    container_name: jagawarga-prometheus
    ports:
      - "9090:9090"
    volumes:
      - "./src/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro"
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - jagawarga-net
  
  grafana:
    image: grafana/grafana:latest
    container_name: jagawarga-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - "./src/monitoring/grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml:ro"
      - "./src/monitoring/grafana/dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml:ro"
      - "./src/monitoring/grafana:/var/lib/grafana/dashboards:ro"
      - grafana-data:/var/lib/grafana
    networks:
      - jagawarga-net
    depends_on:
      - prometheus

networks:
  jagawarga-net:
    driver: bridge

volumes:
  db-data:
  prometheus-data:
  grafana-data:
```

---

## 📊 Risk Management & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|-------------|--------|---------------------|-------|
| CockroachDB encryption fails to start | Medium | High | Fallback: Run without encryption, document limitation | Eng A |
| NATS stream creation timing issue | High | Medium | Add init container with retry loop | Eng A |
| Elixir GenServer crashes frequently | Low | High | Add supervision tree with `:temporary` restart strategy | Eng B |
| Bun service memory leak under load | Medium | Medium | Monitor with Grafana, add restart policy | Eng C |
| TLS certificate path issues in Docker | Medium | Low | Use absolute paths, test on Day 1 | Eng A |
| Grafana dashboard doesn't show data | High | Medium | Verify Prometheus scrape configs early (Day 2 AM) | Eng A |
| Video recording fails/corrupts | Low | Critical | Record in segments, have backup recorder ready | All |
| Time overrun on Day 3 | Medium | High | Cut optional features: reduce dashboard to 2 panels | All |

---

## 📋 Final Deliverables Checklist

### **Code Repository** (GitHub)
- [ ] `/src/services/identity/` - Complete Bun service with Dockerfile
- [ ] `/src/services/anonymizer/` - Complete Bun service with Dockerfile
- [ ] `/src/services/report/` - Complete Elixir/Phoenix service
- [ ] `/src/services/escalation/` - Elixir GenServer worker (embedded in report service)
- [ ] `/src/infras/db/init.sql` - Complete schema with seed data
- [ ] `/src/infras/message-broker/nats-setup.sh` - Stream initialization
- [ ] `/src/infras/gateway/tls.yml` - Traefik TLS config
- [ ] `/src/infras/gateway/dynamic.yml` - Traefik routing rules
- [ ] `/src/monitoring/prometheus/prometheus.yml` - Scrape configuration
- [ ] `/src/monitoring/grafana/dashboard.json` - Exported dashboard
- [ ] `/src/monitoring/grafana/datasources.yml` - Prometheus datasource
- [ ] `/scripts/setup-certs.sh` - Certificate generation script
- [ ] `/scripts/test-anonymous-flow.sh` - Integration test
- [ ] `/scripts/load-test.sh` - Performance test
- [ ] `compose.yml` - Complete orchestration with all services
- [ ] `Makefile` - Commands: up, down, rebuild, logs, health-check
- [ ] `README.md` - Complete setup and usage instructions
- [ ] `.env.example` - Template for environment variables

### **Documentation** (PDF)
- [ ] Cover page (team name, members, NIM, application name)
- [ ] Contribution matrix (who did what, with percentages)
- [ ] General system description
- [ ] Architecture diagram (enhanced with encryption indicators)
- [ ] Tech stack selection with detailed justification
- [ ] **UPDATED Section 3.4.2**: Include NFR-S5 and NFR-O1
- [ ] **UPDATED Section 3.4.3**: Add point 4 about NFR validation
- [ ] PoC implementation results with screenshots (minimum 8):
  - Screenshot 1: docker ps showing all services
  - Screenshot 2: HTTPS padlock in browser
  - Screenshot 3: Database query showing reporter_id = NULL
  - Screenshot 4: Department isolation (different query results)
  - Screenshot 5: Escalation status change
  - Screenshot 6: Grafana dashboard
  - Screenshot 7: Prometheus targets (all UP)
  - Screenshot 8: Chaos test (service restart)
- [ ] Link to GitHub repository
- [ ] Link to YouTube video
- [ ] Assumptions section (updated with TLS certificate note)

### **Video Demonstration** (YouTube/Drive)
- [ ] Duration: 8-10 minutes
- [ ] All 3 members visible/audible
- [ ] Demonstrates all implemented features:
  - [ ] Anonymous report submission
  - [ ] PII scrubbing verification
  - [ ] Department isolation
  - [ ] Auto-escalation
  - [ ] Grafana monitoring
  - [ ] Fault tolerance test
  - [ ] Security features (TLS + encryption)
- [ ] Code walkthrough segment
- [ ] Clear audio and 1080p video quality
- [ ] Uploaded as unlisted link
- [ ] Link added to document and README

---

## 🎯 Success Metrics Summary

By end of Day 4 (22:00 WIB), we will have achieved:

### **Functional Achievements**
- ✅ Complete anonymous reporting flow (FR-1)
- ✅ Authority access with department filtering (FR-5)
- ✅ Auto-escalation triggered every 10 seconds (FR-8)

### **Non-Functional Achievements**
- ✅ Fault isolation proven (NFR-R1) - services survive individual failures
- ✅ Scalability demonstrated (NFR-SC1) - 100 concurrent reports handled
- ✅ PII scrubbing working (NFR-S4) - reporter_id nullified
- ✅ Encryption complete (NFR-S5) - TLS in-transit + DB at-rest
- ✅ Observability operational (NFR-O1) - Grafana dashboard with live metrics

### **Technical Achievements**
- ✅ 7 microservices running in Docker
- ✅ CockroachDB with encryption-at-rest enabled
- ✅ NATS JetStream with persistent streams
- ✅ Traefik Gateway with TLS termination
- ✅ Prometheus + Grafana monitoring stack
- ✅ All services instrumented with health checks
- ✅ Chaos testing completed successfully

### **Submission Achievements**
- ✅ Comprehensive technical document (PDF)