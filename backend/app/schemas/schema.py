from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.models.research        import SessionStatus
from app.models.dev_session     import SessionStatus as DevSessionStatus
from app.models.enquiry_session import EnquiryStatus
from app.models.agent           import SkillLevel, AgentStatus


# ── Shared ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    pass

class UserResponse(BaseModel):
    id:         str
    name:       str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Agent Hub ─────────────────────────────────────────────────────────────────

class AgentResponse(BaseModel):
    id:          str
    name:        str
    role:        str
    department:  str
    skill_level: SkillLevel
    status:      AgentStatus
    created_at:  datetime

    class Config:
        from_attributes = True


class AgentHubRequest(BaseModel):
    requesting_department: str
    role_needed:           str
    skill_level:           SkillLevel
    reason:                str
    session_id:            Optional[str] = None

class AgentHubResponse(BaseModel):
    request_id:    str
    spawned_agent: AgentResponse
    message:       str


# ── Research Hub ──────────────────────────────────────────────────────────────

class ResearchRequest(BaseModel):
    user_id: str
    topic:   str

class ResearchResponse(BaseModel):
    session_id: str
    status:     SessionStatus
    topic:      str
    message:    str

class ResearchResult(BaseModel):
    session_id:  str
    status:      SessionStatus
    topic:       str
    result:      Optional[str]
    agents_used: list[AgentResponse]


# ── Developer Hub ─────────────────────────────────────────────────────────────

class DevRequest(BaseModel):
    user_id: str
    query:   str

class DevResponse(BaseModel):
    session_id: str
    status:     DevSessionStatus
    query:      str
    message:    str

class DevResult(BaseModel):
    session_id:  str
    status:      DevSessionStatus
    query:       str
    result:      Optional[str]
    agents_used: list[AgentResponse]


# ── Enquiry Department ────────────────────────────────────────────────────────

class EnquiryRequest(BaseModel):
    user_id: str
    query:   str

class EnquiryResponse(BaseModel):
    enquiry_session_id: str
    status:             EnquiryStatus
    query:              str
    message:            str

class EnquiryResult(BaseModel):
    enquiry_session_id:  str
    status:              EnquiryStatus
    query:               str
    routing_decision:    Optional[list[str]]   # e.g. ["research", "developer"]
    reasoning:           Optional[str]
    research_session_id: Optional[str]
    dev_session_id:      Optional[str]
