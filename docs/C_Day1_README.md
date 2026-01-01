# JagaWarga Services - Quick Start Guide

## Edge Services (Your Implementation)

### Prerequisites
- Bun runtime installed (`curl -fsSL https://bun.sh/install | bash`)
- Docker & Docker Compose running
- Ports 3001, 3002 available

### Setup Infrastructure

1. **Create Environment File**:

2. **Start Database & Message Broker**:
```bash
docker-compose up -d db mb
```

3. **Initialize Database**:
```bash
docker exec -it jagawarga-db /cockroach/cockroach sql --insecure
cat src/infras/db/seed.sql | docker exec -i jagawarga-db /cockroach/cockroach sql --insecure --database=jagawargadb
```

### Install Dependencies

```bash
# Identity Service
cd src/services/identity
bun install

# Anonymizer Service  
cd ../anonymizer
bun install
```

### Run Services

**Terminal 1 - Identity Service**:
```bash
cd src/services/identity
bun dev
```

**Terminal 2 - Anonymizer Service**:
```bash
cd src/services/anonymizer
bun dev
```

### Test the Services

**Health Checks**:
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

**Test PII Scrubbing**:
```bash
curl -X POST http://localhost:3002/scrub \
  -H "Content-Type: application/json" \
  -d '{"text": "Contact me at 081234567890 or email@example.com"}'
```

**Submit Anonymous Report**:
```bash
curl -X POST http://localhost:3002/reports \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Report",
    "description": "Someone with NIK 3201234567890123 is involved",
    "category": "corruption",
    "location": "Jl. Test"
  }'
```

### Run Integration Tests

```bash
cd src/scripts
bun integration-test.ts
```

### Run Load Test (100 reports)

```bash
cd src/scripts
bun load-test.ts
```

## API Endpoints

### Identity Service (Port 3001)
- `GET /health` - Health check
- `POST /login` - Mock login (email/password)
- `POST /validate` - Validate JWT token

### Anonymizer Service (Port 3002)
- `GET /health` - Health check
- `POST /scrub` - Scrub PII from text
- `POST /reports` - Submit anonymous report (with auto PII scrubbing)

## Day 1 Checklist ✅

- [x] Bun projects initialized (Identity & Anonymizer)
- [x] Database connection pool created
- [x] NATS client integration
- [x] PII scrubbing implementation
- [x] Identity validation endpoints
- [x] Report submission with NATS publish
- [x] Health check endpoints
- [x] Integration test script
- [x] Load test script (100 reports)

## Next Steps (Day 2)

- [ ] End-to-end flow testing
- [ ] Error handling refinement
- [ ] Docker containerization
- [ ] API documentation
- [ ] Demo script preparation
