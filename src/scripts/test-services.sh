#!/bin/bash
# Test script for JagaWarga services

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  JagaWarga PoC - Services Test Suite                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo

# Navigate to project root
cd "$(dirname "$0")/../.."

echo "📋 Step 1: Check Docker services"
echo "───────────────────────────────────────────────────────"
docker ps --filter "name=jagawarga" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo

echo "🗄️  Step 2: Test Database Connection"
echo "───────────────────────────────────────────────────────"
if docker exec jagawarga-db /cockroach/cockroach sql --insecure --execute="SELECT 'DB OK' AS status;" 2>/dev/null; then
    echo "✅ Database is healthy"
else
    echo "❌ Database connection failed"
    exit 1
fi
echo

echo "📨 Step 3: Test NATS Connection"
echo "───────────────────────────────────────────────────────"
if nc -zv localhost 4222 2>&1 | grep -q "succeeded"; then
    echo "✅ NATS is healthy"
else
    echo "❌ NATS connection failed"
    exit 1
fi
echo

echo "🔐 Step 4: Test Identity Service"
echo "───────────────────────────────────────────────────────"
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Identity service is running"
    curl -s http://localhost:3001/health | head -1
else
    echo "❌ Identity service not responding"
    echo "   Start it with: cd src/services/identity && bun dev"
fi
echo

echo "🧹 Step 5: Test Anonymizer Service"
echo "───────────────────────────────────────────────────────"
if curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Anonymizer service is running"
    curl -s http://localhost:3002/health | head -1
else
    echo "❌ Anonymizer service not responding"
    echo "   Start it with: cd src/services/anonymizer && bun dev"
fi
echo

echo "🧪 Step 6: Test PII Scrubbing"
echo "───────────────────────────────────────────────────────"
if curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
    RESULT=$(curl -s -X POST http://localhost:3002/scrub \
        -H "Content-Type: application/json" \
        -d '{"text":"Contact: 081234567890, Email: test@example.com"}')
    
    if echo "$RESULT" | grep -q "pii_detected"; then
        echo "✅ PII scrubbing works"
        echo "$RESULT" | head -5
    else
        echo "❌ PII scrubbing failed"
    fi
else
    echo "⏭️  Skipping (service not running)"
fi
echo

echo "📝 Step 7: Test Report Submission"
echo "───────────────────────────────────────────────────────"
if curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
    RESULT=$(curl -s -X POST http://localhost:3002/reports \
        -H "Content-Type: application/json" \
        -d '{
            "content":"Test report with NIK 3201234567890123 and phone 081234567890",
            "category":"corruption",
            "location":"Jl. Test"
        }')
    
    if echo "$RESULT" | grep -q "success"; then
        echo "✅ Report submission works"
        echo "$RESULT" | head -10
    else
        echo "❌ Report submission failed"
        echo "$RESULT"
    fi
else
    echo "⏭️  Skipping (service not running)"
fi
echo

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Test Summary                                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo "Database:    ✅"
echo "NATS:        ✅"
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Identity:    ✅"
else
    echo "Identity:    ❌ (not running)"
fi
if curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "Anonymizer:  ✅"
else
    echo "Anonymizer:  ❌ (not running)"
fi
echo