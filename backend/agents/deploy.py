"""Deploy agent - creates GitHub releases."""

import httpx
from agents.base import Agent


class DeployAgent(Agent):
    """Agent that creates GitHub releases.

    Requires scopes: github.releases.create
    Uses Token Vault GitHub token for API access.
    """

    def __init__(self, delegation_token: str, github_token: str):
        super().__init__("deploy-agent", delegation_token)
        self.github_token = github_token

    def _run(self, action: str, params: dict) -> dict:
        if action == "github.releases.create":
            return self._create_release(
                repo=params.get("repo", ""),
                tag=params.get("tag", ""),
                name=params.get("name", ""),
                body=params.get("body", ""),
            )
        elif action == "github.releases.list":
            return self._list_releases(params.get("repo", ""))
        else:
            raise ValueError(f"Unknown action: {action}")

    def _create_release(self, repo: str, tag: str, name: str, body: str) -> dict:
        with httpx.Client() as client:
            resp = client.post(
                f"https://api.github.com/repos/{repo}/releases",
                headers={
                    "Authorization": f"Bearer {self.github_token}",
                    "Accept": "application/vnd.github+json",
                },
                json={
                    "tag_name": tag,
                    "name": name or tag,
                    "body": body,
                    "draft": False,
                    "prerelease": False,
                },
            )
            resp.raise_for_status()
            release = resp.json()
            return {
                "target": f"{repo}@{tag}",
                "id": release["id"],
                "tag": release["tag_name"],
                "name": release["name"],
                "html_url": release["html_url"],
            }

    def _list_releases(self, repo: str) -> dict:
        with httpx.Client() as client:
            resp = client.get(
                f"https://api.github.com/repos/{repo}/releases",
                headers={
                    "Authorization": f"Bearer {self.github_token}",
                    "Accept": "application/vnd.github+json",
                },
                params={"per_page": 5},
            )
            resp.raise_for_status()
            releases = resp.json()
            return {
                "target": repo,
                "count": len(releases),
                "releases": [
                    {"tag": r["tag_name"], "name": r["name"], "created_at": r["created_at"]}
                    for r in releases
                ],
            }
