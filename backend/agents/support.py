"""Support agent - reads GitHub issues, searches repos."""

import httpx
from agents.base import Agent


class SupportAgent(Agent):
    """Agent that reads GitHub issues and searches repositories.

    Requires scopes: github.issues.read, github.search
    Uses Token Vault GitHub token for API access.
    """

    def __init__(self, delegation_token: str, github_token: str):
        super().__init__("support-agent", delegation_token)
        self.github_token = github_token

    def _run(self, action: str, params: dict) -> dict:
        if action == "github.issues.list":
            return self._list_issues(params.get("repo", ""))
        elif action == "github.issues.search":
            return self._search_issues(params.get("query", ""))
        elif action == "github.issues.get":
            return self._get_issue(params.get("repo", ""), params.get("number", 0))
        else:
            raise ValueError(f"Unknown action: {action}")

    def _list_issues(self, repo: str) -> dict:
        with httpx.Client() as client:
            resp = client.get(
                f"https://api.github.com/repos/{repo}/issues",
                headers={
                    "Authorization": f"Bearer {self.github_token}",
                    "Accept": "application/vnd.github+json",
                },
                params={"per_page": 10, "state": "open"},
            )
            resp.raise_for_status()
            issues = resp.json()
            return {
                "target": repo,
                "count": len(issues),
                "issues": [
                    {"number": i["number"], "title": i["title"], "state": i["state"]}
                    for i in issues
                ],
            }

    def _search_issues(self, query: str) -> dict:
        with httpx.Client() as client:
            resp = client.get(
                "https://api.github.com/search/issues",
                headers={
                    "Authorization": f"Bearer {self.github_token}",
                    "Accept": "application/vnd.github+json",
                },
                params={"q": query, "per_page": 10},
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "target": query,
                "total_count": data["total_count"],
                "issues": [
                    {"number": i["number"], "title": i["title"], "repo": i["repository_url"].split("/")[-1]}
                    for i in data["items"][:10]
                ],
            }

    def _get_issue(self, repo: str, number: int) -> dict:
        with httpx.Client() as client:
            resp = client.get(
                f"https://api.github.com/repos/{repo}/issues/{number}",
                headers={
                    "Authorization": f"Bearer {self.github_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            resp.raise_for_status()
            issue = resp.json()
            return {
                "target": f"{repo}#{number}",
                "number": issue["number"],
                "title": issue["title"],
                "state": issue["state"],
                "body": (issue.get("body") or "")[:500],
                "labels": [l["name"] for l in issue.get("labels", [])],
                "created_at": issue["created_at"],
            }
