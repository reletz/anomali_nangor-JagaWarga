"""Trigger the protected infrastructure verification pipeline, then wait for its result.

A Maintainer-owned trigger token permits only pipeline invocation. The separate
Developer GitOps API token reads status and cannot merge protected branches.
"""
import json
import os
from pathlib import Path
import time
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

project = quote(os.environ["INFRA_PROJECT_ID"], safe="")
commit = json.loads(Path("dev-update.json").read_text())["commit"]
base = os.environ["CI_API_V4_URL"] + "/projects/" + project
data = urlencode({"token": os.environ["INFRA_TRIGGER_TOKEN"], "ref": "main",
                  "variables[VERIFY_DEV_COMMIT]": commit}).encode()
request = Request(base + "/trigger/pipeline", data=data)
with urlopen(request, timeout=30) as response:
    pipeline = json.load(response)
print("Verification pipeline:", pipeline["web_url"], flush=True)
for attempt in range(180):
    request = Request(base + "/pipelines/" + str(pipeline["id"]),
                      headers={"PRIVATE-TOKEN": os.environ["GITOPS_WRITE_TOKEN"]})
    with urlopen(request, timeout=30) as response:
        status = json.load(response)["status"]
    if status == "success":
        print("DEV validation and production MR creation completed.")
        break
    if status in ("failed", "canceled", "skipped", "manual"):
        raise SystemExit("Infrastructure verification pipeline status: " + status)
    time.sleep(10)
else:
    raise SystemExit("Timed out waiting for infrastructure verification")
