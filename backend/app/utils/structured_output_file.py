from pydantic import BaseModel, Field
from typing import List


class ResearcherStructuredOutput(BaseModel):
    plan:          str        = Field(..., description="The research plan outlining the steps to be taken.")
    agents_needed: List[dict] = Field(..., description="Agents needed: list of {role, skill_level, focus}.")


class DeveloperStructuredOutput(BaseModel):
    plan:          str        = Field(..., description="The development approach in one sentence.")
    agents_needed: List[dict] = Field(..., description="Developer agents needed: list of {role, skill_level, focus}.")
