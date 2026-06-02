import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.dev_session import DevSession, SessionStatus
from app.models.agent import Agent
from app.schemas.schema import DevRequest, DevResponse, DevResult, AgentResponse
from app.tasks.celery_tasks import run_developer_task

router = APIRouter(prefix="/developer", tags=["Developer Hub"])


@router.post("/submit", response_model=DevResponse)
async def submit_developer_task(
    request: DevRequest,
    db: AsyncSession = Depends(get_db),
):
    """Directly submit a task to the Developer Hub (skips the Enquiry routing step)."""
    session = DevSession(
        id=str(uuid.uuid4()),
        user_id=request.user_id,
        query=request.query,
        status=SessionStatus.pending,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    run_developer_task.delay(session.id, request.query)

    return DevResponse(
        session_id=session.id,
        status=session.status,
        query=session.query,
        message="Developer task started! Agents are assembling...",
    )


@router.get("/{session_id}", response_model=DevResult)
async def get_developer_result(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    result  = await db.execute(select(DevSession).where(DevSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Developer session not found")

    agents_result = await db.execute(select(Agent).where(Agent.session_id == session_id))
    agents        = list(agents_result.scalars().all())

    return DevResult(
        session_id=session.id,
        status=session.status,
        query=session.query,
        result=session.result,
        agents_used=[AgentResponse.model_validate(a) for a in agents],
    )


@router.get("/history/{user_id}")
async def get_developer_history(user_id: str, db: AsyncSession = Depends(get_db)):
    result   = await db.execute(
        select(DevSession)
        .where(DevSession.user_id == user_id)
        .order_by(DevSession.created_at.desc())
    )
    return list(result.scalars().all())
