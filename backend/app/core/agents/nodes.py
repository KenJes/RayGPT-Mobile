from typing import Dict, Any
from loguru import logger
from app.core.agents.state import AgentState
from app.core.llm.router import llm_router
from app.core.rag.pipeline import rag_pipeline
from app.core.mcp.client_manager import mcp_manager
import json

async def intent_router(state: AgentState) -> Dict[str, Any]:
    """Uses LLM to decide the user's intent."""
    logger.info("Routing user intent...")
    messages = state.get("messages", [])
    if not messages:
        return {"next_step": "chat"}

    last_user_message = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    
    prompt = f"""
Analyze the following user message and determine the intent.
Options:
- 'chat': Normal conversation or general knowledge.
- 'research': Needs deep web search or current events.
- 'rag': Needs to query personal knowledge base, documents, or context.
- 'tool': Needs to use an external tool (e.g., Google Calendar, Spotify, Weather).

User message: "{last_user_message}"

Respond ONLY with a JSON object with a single key "intent" and the chosen option as the value.
"""
    try:
        response = await llm_router.completion([{"role": "user", "content": prompt}])
        response = response.replace("```json", "").replace("```", "").strip()
        data = json.loads(response)
        intent = data.get("intent", "chat")
    except Exception as e:
        logger.warning(f"Intent routing failed, defaulting to chat: {e}")
        intent = "chat"
        
    logger.info(f"Determined intent: {intent}")
    return {"next_step": intent}

async def research_agent(state: AgentState) -> Dict[str, Any]:
    """Uses Web Search MCP to find information."""
    logger.info("Running research agent...")
    messages = state.get("messages", [])
    last_user_message = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    
    # We would call mcp_manager here for web search tool if implemented.
    # For now, we simulate adding context.
    research_context = f"[Research Context]: Searched for {last_user_message}."
    
    current_rag = state.get("rag_context", "")
    new_rag = current_rag + "\n" + research_context if current_rag else research_context
    return {"rag_context": new_rag}

async def rag_agent(state: AgentState) -> Dict[str, Any]:
    """Queries the RAG pipeline."""
    logger.info("Running RAG agent...")
    messages = state.get("messages", [])
    user_id = state.get("user_id", "default_user")
    last_user_message = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    
    rag_context = ""
    try:
        rag_results = await rag_pipeline.query(last_user_message, user_id)
        if rag_results:
            context_parts = []
            for r in rag_results:
                source = r.metadata.get("source_filename", "documento")
                context_parts.append(f"[Fuente: {source}]\n{r.content}")
            rag_context = "\n\n".join(context_parts)
    except Exception as e:
        logger.warning(f"RAG search failed: {e}")
        
    current_rag = state.get("rag_context", "")
    new_rag = current_rag + "\n\n[RAG Context]:\n" + rag_context if current_rag else "[RAG Context]:\n" + rag_context
    return {"rag_context": new_rag}

async def tool_agent(state: AgentState) -> Dict[str, Any]:
    """Executes MCP tools."""
    logger.info("Running tool agent...")
    # Simulated tool usage
    tool_context = "[Tool Context]: Tool execution finished."
    current_rag = state.get("rag_context", "")
    new_rag = current_rag + "\n" + tool_context if current_rag else tool_context
    return {"rag_context": new_rag}

async def generator(state: AgentState) -> Dict[str, Any]:
    """Generates the final response using llm_router."""
    logger.info("Running generator...")
    from app.core.llm.prompts import (
        RAYMUNDO_SYSTEM_PROMPT_AMIGABLE,
        RAYMUNDO_SYSTEM_PROMPT_DIRECTO,
        RAG_CONTEXT_PROMPT
    )
    
    mode = state.get("mode", "amigable")
    system_prompt = (
        RAYMUNDO_SYSTEM_PROMPT_AMIGABLE
        if mode == "amigable"
        else RAYMUNDO_SYSTEM_PROMPT_DIRECTO
    )
    
    rag_context = state.get("rag_context", "")
    
    final_messages = [{"role": "system", "content": system_prompt}]
    
    if rag_context:
        final_messages.append({"role": "system", "content": RAG_CONTEXT_PROMPT.format(context=rag_context)})
        
    for msg in state.get("messages", []):
        final_messages.append(msg)
        
    # We will pass the stream generator out in state or handle it in orchestrator
    return {"final_messages": final_messages}
