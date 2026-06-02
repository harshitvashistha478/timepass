import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.enquiry_session import EnquirySession, EnquiryStatus
from app.schemas.schema import EnquiryRequest, EnquiryResponse, EnquiryResult
from app.tasks.celery_tasks import run_enquiry_task

router = APIRouter(prefix="/enquiry", tags=["Enquiry Department"])


@router.post("/submit", response_model=EnquiryResponse)
async def submit_enquiry(
    request: EnquiryRequest,
    db: AsyncSession = Depends(get_db),
):
    session = EnquirySession(
        id=str(uuid.uuid4()),
        user_id=request.user_id,
        query=request.query,
        status=EnquiryStatus.pending,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    run_enquiry_task.delay(session.id, request.query, request.user_id)

    return EnquiryResponse(
        enquiry_session_id=session.id,
        status=session.status,
        query=session.query,
        message="Query received by Enquiry Department. Routing in progress...",
    )


@router.get("/{enquiry_session_id}", response_model=EnquiryResult)
async def get_enquiry_result(
    enquiry_session_id: str,
    db: AsyncSession = Depends(get_db),
):
    result  = await db.execute(select(EnquirySession).where(EnquirySession.id == enquiry_session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Enquiry session not found")

    routing = json.loads(session.routing_decision) if session.routing_decision else None

    return EnquiryResult(
        enquiry_session_id=session.id,
        status=session.status,
        query=session.query,
        routing_decision=routing,
        reasoning=session.reasoning,
        research_session_id=session.research_session_id,
        dev_session_id=session.dev_session_id,
    )


@router.get("/history/{user_id}")
async def get_enquiry_history(user_id: str, db: AsyncSession = Depends(get_db)):
    result   = await db.execute(
        select(EnquirySession)
        .where(EnquirySession.user_id == user_id)
        .order_by(EnquirySession.created_at.desc())
    )
    sessions = list(result.scalars().all())
    return sessions
