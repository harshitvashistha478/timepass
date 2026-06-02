"""
Hub Registry — the single source of truth for all hubs in Cyber Hub.

To add a new hub:
  1. Create  app/agents/<hub_name>/  with your LangGraph graph
  2. Add a Celery task in  app/tasks/celery_tasks.py  (task name = "run_<hub_name>")
  3. Add a DB session model in  app/models/<hub_name>_session.py
  4. Add API routes in  app/api/routes/<hub_name>.py  and register in main.py
  5. Add an entry below — the Enquiry Department picks it up automatically.
"""

from typing import TypedDict


class HubConfig(TypedDict):
    task_name: str          # Celery task name, e.g. "run_research"
    description: str        # Shown to the Enquiry Department LLM for routing decisions


HUB_REGISTRY: dict[str, HubConfig] = {
    "research": {
        "task_name": "run_research",
        "description": (
            "Handles research queries, fact-finding, deep analysis of topics, "
            "current events, scientific or historical research, data analysis, "
            "competitive intelligence, market research, or any question that needs "
            "thorough investigation and a written report."
        ),
    },
    "developer": {
        "task_name": "run_developer",
        "description": (
            "Handles all tech and coding related tasks: building projects "
            "(frontend, backend, full-stack), architecture decisions, code reviews, "
            "debugging, choosing a tech stack, API design, database schema design, "
            "DevOps setup, or any question about software engineering approaches."
        ),
    },
}
