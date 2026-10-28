"""Create fresh local-only environment values without printing them or overwriting a file."""
from pathlib import Path
import secrets

values = {"JWT_SECRET": secrets.token_urlsafe(48), "SECRET_KEY_BASE": secrets.token_urlsafe(64),
          "DEMO_LOGIN_PASSWORD": secrets.token_urlsafe(24)}
with Path(".env").open("x", encoding="utf-8") as output:
    output.write("".join(key + "=" + value + "\n" for key, value in values.items()))
print("Created local .env; values are intentionally not printed.")
