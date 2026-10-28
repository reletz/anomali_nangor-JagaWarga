"""Local isolated end-to-end test of built images; no registry or homelab access.

Requires Docker. Uses temporary TLS CockroachDB, non-root/read-only app containers,
synthetic identities and a loopback-only gateway. Removes only its own resources.
"""
import json
import secrets
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import uuid

PREFIX = "xops-smoke-" + uuid.uuid4().hex[:8]
NETWORK = PREFIX + "-net"
DB_IMAGE = "cockroachdb/cockroach:v24.3.15"
containers, volumes = [], []
password, login_password, jwt_secret = [secrets.token_hex(32) for _ in range(3)]
source = __import__("pathlib").Path(__file__).resolve().parents[1]


def docker(*args, input=None):
    result = subprocess.run(["docker", *args], input=input, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    if result.returncode:
        # Avoid printing command arguments, which include ephemeral credentials.
        raise RuntimeError("Local Docker operation failed: " + result.stderr[-3000:])
    return (result.stdout + (result.stderr if args and args[0] == "logs" else "")).strip()


def run(name, image, args=(), extra=(), env=None, readonly=True):
    full = PREFIX + "-" + name
    options = ["run", "-d", "--name", full, "--network", NETWORK, "--network-alias", name,
               "--label", "xops.local-validation=true", "--memory", "1g", "--cpus", "1"]
    if readonly:
        options += ["--read-only", "--user", "1000:1000", "--cap-drop", "ALL",
                    "--security-opt", "no-new-privileges=true", "--tmpfs", "/tmp:uid=1000,gid=1000,mode=1777"]
    for key, value in (env or {}).items():
        options += ["-e", key + "=" + value]
    containers.append(full)
    docker(*options, *extra, image, *args)
    return full


def http(path, body=None, token=None, expected=200):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = Request(base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        with urlopen(request, timeout=15) as response:
            status, payload = response.status, json.load(response)
    except HTTPError as error:
        status, payload = error.code, json.load(error)
    assert status == expected, f"{path}: expected {expected}, received {status}"
    return payload


try:
    docker("network", "create", "--label", "xops.local-validation=true", NETWORK)
    for suffix in ("ca", "db-certs", "admin-certs", "app-certs"):
        volume = PREFIX + "-" + suffix
        docker("volume", "create", "--label", "xops.local-validation=true", volume)
        volumes.append(volume)
    mounts = []
    for suffix, target in [("ca", "/ca"), ("db-certs", "/db"), ("admin-certs", "/admin"), ("app-certs", "/appcert")]:
        mounts += ["-v", PREFIX + "-" + suffix + ":" + target]
    # Root owns private key files; group 1000 may read them, matching Kubernetes Secret+fsGroup.
    docker("run", "--rm", "--user", "0:0", *mounts, "--entrypoint", "/bin/sh", DB_IMAGE, "-ec",
           "/cockroach/cockroach cert create-ca --certs-dir=/db --ca-key=/ca/ca.key;"
           " /cockroach/cockroach cert create-node db localhost 127.0.0.1 --certs-dir=/db --ca-key=/ca/ca.key;"
           " cp /db/ca.crt /admin/ca.crt; cp /db/ca.crt /appcert/ca.crt;"
           " /cockroach/cockroach cert create-client root --certs-dir=/admin --ca-key=/ca/ca.key;"
           " chgrp 1000 /db/node.key /admin/client.root.key; chmod 440 /db/node.key /admin/client.root.key")
    db = run("db", DB_IMAGE, ["start-single-node", "--certs-dir=/certs", "--advertise-addr=db",
                            "--listen-addr=0.0.0.0:26257", "--store=/data", "--cache=128MiB", "--max-sql-memory=128MiB"],
             ["--entrypoint", "/cockroach/cockroach", "-v", PREFIX + "-db-certs:/certs:ro", "--tmpfs", "/data:uid=1000,gid=1000,mode=0700"])
    last_error = ""
    for attempt in range(60):
        if docker("inspect", "-f", "{{.State.Status}}", db) == "exited":
            raise RuntimeError("TLS database exited: " + docker("logs", db)[-2500:])
        try:
            docker("run", "--rm", "--network", NETWORK, "--user", "1000:1000", "-v",
                   PREFIX + "-admin-certs:/certs:ro", DB_IMAGE,
                   "sql", "--certs-dir=/certs", "--host=db", "--user=root", "-e", "SELECT 1")
            break
        except RuntimeError as error:
            last_error = str(error)
            time.sleep(1)
    else:
        raise RuntimeError("TLS CockroachDB did not become ready: " + docker("logs", db)[-1500:] + last_error)
    schema = (source / "src/infras/db/init.sql").read_text()
    schema += "\n" + (source / "src/infras/db/seed.sql").read_text().split("INSERT INTO users")[0]
    schema += f"\nCREATE USER IF NOT EXISTS jagawarga WITH PASSWORD '{password}'; GRANT ALL ON DATABASE jagawargadb TO jagawarga; GRANT ALL ON SCHEMA jagawargadb.public TO jagawarga; GRANT ALL ON TABLE jagawargadb.public.* TO jagawarga;"
    docker("run", "--rm", "-i", "--network", NETWORK, "--user", "1000:1000", "-v",
           PREFIX + "-admin-certs:/certs:ro", DB_IMAGE, "sql", "--certs-dir=/certs", "--host=db", "--user=root", input=schema)
    run("mb", "nats:2.11.3-alpine", ["-js", "-sd", "/data", "-m", "8222"],
        ["--tmpfs", "/data:uid=1000,gid=1000,mode=0700"])
    env = {"NODE_ENV": "production", "DB_HOST": "db", "DB_PORT": "26257", "DB_NAME": "jagawargadb",
           "DB_USER": "jagawarga", "DB_PASSWORD": password, "DB_SSL": "true", "DB_CA_FILE": "/certs/ca.crt",
           "DATABASE_URL": "ecto://jagawarga:" + password + "@db:26257/jagawargadb",
           "NATS_URL": "nats://mb:4222", "JWT_SECRET": jwt_secret, "DEMO_LOGIN_PASSWORD": login_password,
           "SECRET_KEY_BASE": secrets.token_hex(64), "PHX_SERVER": "true", "PHX_HOST": "localhost", "ERL_FLAGS": "+S 2:2"}
    extra = ["-v", PREFIX + "-app-certs:/certs:ro"]
    report = run("report-service", "xops-local/report-service:validation", extra=extra, env=env)
    docker("exec", report, "/app/bin/report", "eval", "Report.Release.migrate()")
    run("identity-service", "xops-local/identity-service:validation", extra=extra, env=env)
    run("anonymizer-service", "xops-local/anonymizer-service:validation", extra=extra, env=env)
    run("frontend", "xops-local/frontend:validation",
        extra=["--tmpfs", "/app/.next/cache:uid=1000,gid=1000,mode=0700"],
        env={"NODE_ENV": "production", "PORT": "5000", "HOSTNAME": "0.0.0.0"})
    gateway = run("gateway", "traefik:v3.4.1", ["--entrypoints.web.address=:8080", "--providers.file.filename=/etc/traefik/dynamic.yml"],
        extra=["-p", "127.0.0.1::8080", "--mount", "type=bind,source=" + str(source / "src/infras/gateway/dynamic.yml") + ",target=/etc/traefik/dynamic.yml,readonly"],
        readonly=False)
    port = docker("port", gateway, "8080/tcp").split(":")[-1]
    base = "http://127.0.0.1:" + port
    for attempt in range(90):
        try:
            http("/health")
            http("/reports/health")
            http("/identity/health")
            http("/anonymizer/health")
            break
        except (AssertionError, HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            time.sleep(1)
    else:
        for container in containers:
            if container != gateway:
                # Do not dump general logs: identity events may contain bearer/user data.
                print(container, docker("inspect", "-f", "{{.State.Status}}", container))
        raise RuntimeError("Application readiness timeout")
    nik = "99000000" + str(int(uuid.uuid4().hex[:8], 16)).zfill(10)[-8:]
    http("/identity/register", {"nik": nik, "name": "Synthetic smoke citizen"})
    citizen = http("/identity/login", {"nik": nik, "password": login_password})
    http("/reports/api/my-reports", token=citizen["token"])
    http("/identity/validate", {"token": "invalid"}, expected=401)
    authority = http("/identity/login/authority", {"email": "kebersihan@bandung.go.id", "password": login_password})
    http("/reports/api/reports", token=authority["token"])
    created = http("/anonymizer/scrub", {"category": "sampah", "content": "Contact sample@example.invalid about waste",
                   "authority_department": "kebersihan", "privacy_level": "public"})
    reports = http("/reports/api/reports/public")
    saved = next(row for row in reports["data"] if row["id"] == created["report_id"])
    assert "sample@example.invalid" not in saved["content"]
    for container in containers[2:-1]:
        assert docker("inspect", "-f", "{{.HostConfig.ReadonlyRootfs}}", container) == "true"
    print("PASS: four app images, non-root/read-only runtime, verified database TLS, schema/migrations, ingress routing, citizen and authority auth, PII scrubbing and public report read.")
finally:
    for container in reversed(containers):
        subprocess.run(["docker", "rm", "-f", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["docker", "network", "rm", NETWORK], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for volume in volumes:
        subprocess.run(["docker", "volume", "rm", volume], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
