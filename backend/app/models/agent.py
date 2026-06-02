"""
NOTE: session_id was previously a FK to research_sessions.id.
It is now a plain string so agents can belong to any hub session
(research, developer, or any future hub).

If you are migrating an existing database, run:
    ALTER TABLE agents DROP CONSTRAINT agents_session_id_fkey;
Or drop and recreate the table if you are running create_all on a fresh DB.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column
import enum as py_enum

from app.core.database import Base


class SkillLevel(str, py_enum.Enum):
    junior = "junior"
    mid    = "mid"
    senior = "senior"
    expert = "expert"


class AgentStatus(str, py_enum.Enum):
    idle     = "idle"
    busy     = "busy"
    released = "released"


class Agent(Base):
    __tablename__ = "agents"

    id:           Mapped[str]         = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name:         Mapped[str]         = mapped_column(String(100), nullable=False)
    role:         Mapped[str]         = mapped_column(String(100), nullable=False)
    department:   Mapped[str]         = mapped_column(String(100), nullable=False)   # "research" | "developer" | …
    skill_level:  Mapped[SkillLevel]  = mapped_column(Enum(SkillLevel), default=SkillLevel.mid)
    status:       Mapped[AgentStatus] = mapped_column(Enum(AgentStatus), default=AgentStatus.idle)
    created_at:   Mapped[datetime]    = mapped_column(DateTime, default=datetime.utcnow)

    # Plain string — no FK so it can reference any hub session table.
    # Format convention: "<session_uuid>"  (same UUID used in the relevant hub session table)
    session_id:   Mapped[str | None]  = mapped_column(String, nullable=True)

    # Which hub this agent was spawned for ("research", "developer", …)
    session_type: Mapped[str | None]  = mapped_column(String(50), nullable=True)
