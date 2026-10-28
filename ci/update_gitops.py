"""Update only DEV through GitLab's Commits API. Never deploy with kubectl."""
import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

SERVICES = ("frontend", "identity-service", "anonymizer-service", "report-service")


def api(path, data=None):
    base = os.environ["CI_API_V4_URL"]
    request = Request(base + path, data=json.dumps(data).encode() if data else None,
                      headers={"PRIVATE-TOKEN": os.environ["GITOPS_WRITE_TOKEN"],
                               "Content-Type": "application/json"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def main():
    project = quote(os.environ["INFRA_PROJECT_ID"], safe="")
    images = {}
    for service in SERVICES:
        image = json.loads(Path(f"releases/{service}.json").read_text())
        assert image["repository"] == os.environ["XOPS_REGISTRY_IMAGE"] + "/" + service
        assert re.fullmatch(r"sha256:[a-f0-9]{64}", image["digest"])
        images[service] = image
    # Use the merged application's MR author as the human release originator.
    originator = os.environ["GITLAB_USER_ID"]
    request = Request(os.environ["CI_API_V4_URL"] + "/projects/" + os.environ["CI_PROJECT_ID"]
                      + "/repository/commits/" + os.environ["CI_COMMIT_SHA"] + "/merge_requests",
                      headers={"JOB-TOKEN": os.environ["CI_JOB_TOKEN"]})
    with urlopen(request, timeout=30) as response:
        associated = json.load(response)
    merged = [mr for mr in associated if mr["state"] == "merged"]
    if merged:
        originator = str(merged[0]["author"]["id"])
    release = {"enabled": True, "images": images, "source": {
        "sha": os.environ["CI_COMMIT_SHA"], "pipeline": os.environ["CI_PIPELINE_URL"],
        "initiator": originator}}
    branch = "gitops-dev"
    try:
        api(f"/projects/{project}/repository/branches/{branch}")
    except HTTPError as error:
        if error.code != 404:
            raise
        api(f"/projects/{project}/repository/branches", {"branch": branch, "ref": "main"})
    path = "gitops/environments/dev/release.yaml"
    current = api(f"/projects/{project}/repository/files/{quote(path, safe='')}?ref={branch}")
    result = api(f"/projects/{project}/repository/commits", {
        "branch": branch, "commit_message": "Deploy DEV " + os.environ["CI_COMMIT_SHA"],
        "actions": [{"action": "update", "file_path": path,
                     "last_commit_id": current["last_commit_id"],
                     "content": json.dumps(release, indent=2) + "\n"}]})
    Path("dev-update.json").write_text(json.dumps({"commit": result["id"], "branch": branch}))
    Path("dev-update.env").write_text("VERIFY_DEV_COMMIT=" + result["id"] + "\n")
    print("Updated DEV GitOps commit", result["id"])


if __name__ == "__main__":
    main()
