import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum as py_enum

from app.core.database import Base


class EnquiryStatus(str, py_enum.Enum):
    pending    = "pending"
    routing    = "routing"
    dispatched = "dispatched"   
    failed     = "failed"


class EnquirySession(Base):
    __tablename__ = "enquiry_sessions"

    id:         Mapped[str]           = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:    Mapped[str]           = mapped_column(String, ForeignKey("users.id"))
    query:      Mapped[str]           = mapped_column(Text, nullable=False)
    status:     Mapped[EnquiryStatus] = mapped_column(Enum(EnquiryStatus), default=EnquiryStatus.pending)

  
    routing_decision: Mapped[str | None] = mapped_column(Text, nullable=True) 
    reasoning:        Mapped[str | None] = mapped_column(Text, nullable=True)

    research_session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    dev_session_id:      Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="enquiry_sessions")  # type: ignore
