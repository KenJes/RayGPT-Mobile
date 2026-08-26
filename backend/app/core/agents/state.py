from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    messages: List[Dict[str, Any]]
    final_messages: List[Dict[str, Any]]
    conversation_id: str
    user_id: str
    mode: str
    next_step: str
    rag_context: str
