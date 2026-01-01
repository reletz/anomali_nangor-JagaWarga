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