import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id:         Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name:       Mapped[str]      = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sessions:          Mapped[list["ResearchSession"]] = relationship(back_populates="user")   # type: ignore
    dev_sessions:      Mapped[list["DevSession"]]      = relationship(back_populates="user")   # type: ignore
    enquiry_sessions:  Mapped[list["EnquirySession"]]  = relationship(back_populates="user")   # type: ignore
