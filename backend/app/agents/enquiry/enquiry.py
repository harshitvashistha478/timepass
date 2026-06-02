from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.utils.agents_extras import get_llm
from app.agents.registry import HUB_REGISTRY


class EnquiryDecision(BaseModel):
    hubs: list[str] = Field(
        ...,
        description=(
            "List of hub names to route to. "
            "Single hub: ['research'] or ['developer']. "
            "Both: ['research', 'developer']."
        )
    )
    reasoning: str = Field(..., description="One sentence explaining the routing choice.")


def _build_enquiry_system_prompt() -> str:
    hub_lines = "\n".join(
        f'  - "{name}": {cfg["description"]}'
        for name, cfg in HUB_REGISTRY.items()
    )
    hub_names = list(HUB_REGISTRY.keys())

    return f"""
You are the Enquiry Department at Cyber Hub — the intelligent router that decides
which hub(s) should handle a user's query.

Available hubs:
{hub_lines}

Routing rules:
1. Read the query carefully and match it to the hub whose description fits best.
2. Only route to multiple hubs when the query genuinely requires BOTH (e.g. "research
   the best database for a high-traffic app and then help me design the schema" needs
   both research AND developer).
3. When unsure between two hubs, pick the one that best matches the user's primary intent.
4. Never invent hub names — only use the ones listed above: {hub_names}.

Respond ONLY with valid JSON, no extra text:
{{
    "hubs": ["hub_name"],
    "reasoning": "one sentence"
}}
"""


async def route_query(query: str) -> EnquiryDecision:
    """
    Call the LLM to decide which hub(s) should handle `query`.
    Falls back to ["research"] if the LLM call fails or returns invalid hubs.
    """
    llm = get_llm(department_model="researcher")
    enquiry_llm = llm.with_structured_output(EnquiryDecision)

    try:
        decision: EnquiryDecision = await enquiry_llm.ainvoke([
            SystemMessage(content=_build_enquiry_system_prompt()),
            HumanMessage(content=f"User query: {query}"),
        ])

        # Sanitise: only keep hubs that exist in the registry
        valid_hubs = [h for h in decision.hubs if h in HUB_REGISTRY]
        if not valid_hubs:
            valid_hubs = list(HUB_REGISTRY.keys())[:1]   # fallback to first hub

        return EnquiryDecision(hubs=valid_hubs, reasoning=decision.reasoning)

    except Exception as exc:
        print(f"[EnquiryDept] Routing error — {exc}. Falling back to first hub.")
        first_hub = list(HUB_REGISTRY.keys())[0]
        return EnquiryDecision(
            hubs=[first_hub],
            reasoning=f"Fallback routing due to error: {exc}",
        )
