import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.agent.chat_agent import process_chat
from app.schemas.chat import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    query_text = request.question or request.message
    if not query_text or not query_text.strip():
        raise HTTPException(status_code=400, detail="Question or message cannot be empty.")
    try:
        result = await asyncio.to_thread(process_chat, query_text, request.conversation_id)
        return ChatResponse(
            answer=result["answer"],
            insight=result["insight"],
            sql=result["sql"],
            sql_query=result["sql_query"],
            results=result["results"],
            table=result["table"],
            chart=result["chart"],
            tables_used=result["tables_used"],
            tools_called=result["tools_called"],
            latency_ms=result["latency_ms"],
            status=result.get("status") or "ok",
            model=result.get("model"),
            cached=bool(result.get("cached", False)),
            intent=result.get("intent"),
            blocks=result.get("blocks"),
            follow_ups=result.get("follow_ups"),
            scope=result.get("scope"),
            caveats=result.get("caveats"),
        )
    except Exception as e:
        logger.exception("Chat processing error: %s", e)
        raise HTTPException(status_code=500, detail="Chat processing failed.")
