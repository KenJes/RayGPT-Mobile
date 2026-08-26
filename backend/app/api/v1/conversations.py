from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import ConversationCreate, ConversationResponse
from app.services.memory import memory_service

router = APIRouter()

@router.get("", response_model=List[ConversationResponse])
async def list_conversations():
    return [] # TODO

@router.get("/{conv_id}")
async def get_conversation(conv_id: str):
    history = await memory_service.get_history(conv_id)
    return {"id": conv_id, "messages": history}

@router.delete("/{conv_id}")
async def delete_conversation(conv_id: str):
    return {"status": "deleted"} # TODO

@router.put("/{conv_id}")
async def update_conversation(conv_id: str, data: dict):
    return {"status": "updated"} # TODO
