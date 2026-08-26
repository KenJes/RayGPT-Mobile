import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger
from app.core.llm.prompts import (
    RAYMUNDO_SYSTEM_PROMPT_AMIGABLE,
    RAYMUNDO_SYSTEM_PROMPT_DIRECTO,
    RAG_CONTEXT_PROMPT,
    TOOL_USE_PROMPT,
)
from app.core.llm.router import llm_router
from app.core.rag.pipeline import rag_pipeline
from app.core.mcp.client_manager import mcp_manager
from app.services.memory import memory_service
from app.models.schemas import MessageCreate, MessageResponse

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time chat with Raymundo using LangGraph.
    """
    from app.core.agents.orchestrator import orchestrator
    
    await manager.connect(websocket)
    logger.info("New WebSocket connection established")

    try:
        while True:
            try:
                raw = await websocket.receive_text()
                data = json.loads(raw)

                msg_type = data.get("type", "message")
                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue

                content = data.get("content", "")
                conversation_id = data.get("conversation_id", str(uuid.uuid4()))
                user_id = data.get("user_id", "default_user")
                mode = data.get("mode", "amigable")

                logger.info(f"[{user_id}] Message received: {content[:100]}...")

                messages = []
                # Load conversation history
                try:
                    history = await memory_service.get_history(conversation_id)
                    for h in history:
                        messages.append({"role": h.role, "content": h.content})
                except Exception as e:
                    logger.warning(f"Failed to load history: {e}")

                messages.append({"role": "user", "content": content})
                
                initial_state = {
                    "messages": messages,
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "mode": mode,
                    "rag_context": "",
                    "next_step": "",
                    "final_messages": []
                }

                # --- Run Orchestrator ---
                full_response = ""
                try:
                    async for token in orchestrator.run(initial_state):
                        full_response += token
                        await websocket.send_json({
                            "type": "token",
                            "content": token,
                        })
                except Exception as e:
                    logger.error(f"Orchestrator streaming error: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Error al generar respuesta: {e}",
                    })
                    continue

                # --- Save messages to memory ---
                message_id = str(uuid.uuid4())
                try:
                    await memory_service.save_message(
                        conversation_id, "user", content
                    )
                    await memory_service.save_message(
                        conversation_id, "assistant", full_response
                    )
                except Exception as e:
                    logger.warning(f"Failed to save messages: {e}")

                # --- Send completion signal ---
                await websocket.send_json({
                    "type": "message_complete",
                    "content": full_response,
                    "message_id": message_id,
                    "conversation_id": conversation_id,
                })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "content": "JSON inválido.",
                })
            except WebSocketDisconnect:
                logger.info("Client disconnected")
                break
            except Exception as e:
                logger.error(f"Unexpected error in message loop: {e}")
                try:
                    await websocket.send_json({
                        "type": "error",
                        "content": "Error interno del servidor.",
                    })
                except Exception:
                    break

    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        manager.disconnect(websocket)
        logger.info("WebSocket connection closed")


@router.post("/message", response_model=MessageResponse)
async def send_message_rest(message: MessageCreate):
    """REST fallback for non-streaming chat using LangGraph."""
    from app.core.agents.orchestrator import orchestrator
    
    messages = []
    try:
        history = await memory_service.get_history(message.conversation_id)
        for h in history:
            messages.append({"role": h.role, "content": h.content})
    except Exception:
        pass

    messages.append({"role": "user", "content": message.content})
    
    initial_state = {
        "messages": messages,
        "conversation_id": message.conversation_id,
        "user_id": "default_user",
        "mode": "amigable",
        "rag_context": "",
        "next_step": "",
        "final_messages": []
    }

    response_text = ""
    async for token in orchestrator.run(initial_state):
        response_text += token

    await memory_service.save_message(message.conversation_id, "user", message.content)
    saved_msg = await memory_service.save_message(
        message.conversation_id, "assistant", response_text
    )

    return MessageResponse(
        id=saved_msg.id if saved_msg else str(uuid.uuid4()),
        content=response_text,
        role="assistant",
        timestamp=saved_msg.timestamp if saved_msg else None,
        tool_calls=[],
    )