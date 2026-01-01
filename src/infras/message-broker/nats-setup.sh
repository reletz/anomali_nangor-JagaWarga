  #!/bin/bash
  # nats-setup.sh
  nats stream add REPORTS \
    --subjects "report.*" \
    --storage file \
    --retention limits \
    --max-msgs 10000 \
    --max-age 7d