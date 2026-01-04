# JagaWarga API Documentation

## Identity Service (Port 3001)

### Base URL
```
http://localhost:8000/identity
```

### Endpoints

#### 1. Health Check
**GET** `/health`

Returns service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "identity",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "checks": {
    "database": "ok",
    "nats": "ok"
  }
}
```

#### 2. Login (Generate JWT)
**POST** `/login`

Authenticate and get JWT token.

**Request Body:**
```json
{
  "email": "kebersihan@bandung.go.id",
  "password": "demo123"
}
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "kebersihan@bandung.go.id",
    "role": "authority",
    "department": "kebersihan"
  }
}
```

**Response (Failure):**
```json
{
  "error": "Invalid credentials"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/identity/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kebersihan@bandung.go.id",
    "password": "demo123"
  }'
```

#### 3. Validate Token
**POST** `/validate`

Verify JWT token and get user info.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "kebersihan@bandung.go.id",
    "role": "authority",
    "department": "kebersihan"
  }
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/identity/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## Anonymizer Service (Port 3002)

### Base URL
```
http://localhost:8000/anonymizer
```

### Endpoints

#### 1. Health Check
**GET** `/health`

Returns service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "anonymizer",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "checks": {
    "database": "ok",
    "nats": "ok"
  }
}
```

#### 2. PII Scrubbing
**POST** `/scrub`

Detect and redact PII (Personally Identifiable Information).

**Request Body:**
```json
{
  "text": "Hubungi saya di 081234567890 atau email@example.com, NIK: 3201234567890123"
}
```

**Response:**
```json
{
  "original_length": 72,
  "scrubbed_text": "Hubungi saya di [PHONE-REDACTED] atau [EMAIL-REDACTED], NIK: [NIK-REDACTED]",
  "scrubbed_length": 85,
  "pii_detected": 3,
  "confidence": "high",
  "items": [
    "Phone: 0812***",
    "Email: em***@example.com",
    "NIK: 3201***"
  ]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/anonymizer/scrub \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hubungi saya di 081234567890 atau email@example.com, NIK: 3201234567890123"
  }'
```

---

## PII Detection Patterns

The anonymizer detects and scrubs the following PII:

| Pattern | Example | Scrubbed Output |
|---------|---------|-----------------|
| **NIK (Indonesian ID)** | 3201234567890123 | [NIK-REDACTED] |
| **Phone Numbers** | 081234567890 | [PHONE-REDACTED] |
| **Email Addresses** | john@example.com | [EMAIL-REDACTED] |
| **Physical Addresses** | Jl. Sudirman No. 123 | [ADDRESS-REDACTED] |
| **Bank Account Numbers** | 1234567890 | [BANK-ACCOUNT-REDACTED] |

---

## Demo Workflow

### Step 1: Login as Authority
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/identity/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kebersihan@bandung.go.id",
    "password": "demo123"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

### Step 2: Validate Token
```bash
curl -s -X POST http://localhost:8000/identity/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}" | jq .
```

### Step 3: Test PII Scrubbing
```bash
curl -s -X POST http://localhost:8000/anonymizer/scrub \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Saya Ahmad (NIK: 3201234567890001), tinggal di Jl. Sudirman No. 45. Hubungi saya di 081234567890 atau ahmad@email.com"
  }' | jq .
```

### Step 4: Health Checks
```bash
# Identity Service
curl -s http://localhost:8000/identity/health | jq .

# Anonymizer Service
curl -s http://localhost:8000/anonymizer/health | jq .
```

---

## Available Test Authorities

The database is seeded with 5 test authorities:

| Email | Password | Department | Role |
|-------|----------|-----------|------|
| kebersihan@bandung.go.id | demo123 | kebersihan | authority |
| kesehatan@bandung.go.id | demo123 | kesehatan | authority |
| pu@bandung.go.id | demo123 | infrastruktur | authority |
| polresta@bandung.go.id | demo123 | keamanan | authority |
| blh@bandung.go.id | demo123 | lingkungan | authority |

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": "Text is required"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid or expired token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

---

## Retry & Resilience

Both services implement automatic retry logic (3 attempts with exponential backoff) for:
- Database queries
- Network requests
- NATS connections

## Graceful Shutdown

Services handle `SIGTERM` and `SIGINT` signals, properly closing all connections before exit.

Send signals:
```bash
# Graceful shutdown
kill -TERM <pid>
# or
kill -INT <pid>
```

Services will:
1. Stop accepting new requests
2. Close database connections
3. Close NATS connections
4. Exit cleanly
