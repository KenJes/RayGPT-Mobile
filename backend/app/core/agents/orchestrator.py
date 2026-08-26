from langgraph.graph import StateGraph, END
from app.core.agents.state import AgentState
from app.core.agents.nodes import intent_router, research_agent, rag_agent, tool_agent, generator
from app.core.llm.router import llm_router
from typing import AsyncGenerator
import asyncio

class RaymundoOrchestrator:
    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("intent_router", intent_router)
        workflow.add_node("research_agent", research_agent)
        workflow.add_node("rag_agent", rag_agent)
        workflow.add_node("tool_agent", tool_agent)
        workflow.add_node("generator", generator)

        # Set entry point
        workflow.set_entry_point("intent_router")

        # Define routing function
        def route_intent(state: AgentState) -> str:
            step = state.get("next_step", "chat")
            if step == "research":
                return "research_agent"
            elif step == "rag":
                return "rag_agent"
            elif step == "tool":
                return "tool_agent"
            return "generator"

        # Conditional edges from intent_router
        workflow.add_conditional_edges(
            "intent_router",
            route_intent,
            {
                "research_agent": "research_agent",
                "rag_agent": "rag_agent",
                "tool_agent": "tool_agent",
                "generator": "generator"
            }
        )

        # Edges from specialized agents to generator
        workflow.add_edge("research_agent", "generator")
        workflow.add_edge("rag_agent", "generator")
        workflow.add_edge("tool_agent", "generator")
        workflow.add_edge("generator", END)

        return workflow.compile()

    async def run(self, initial_state: AgentState) -> AsyncGenerator[str, None]:
        """Runs the graph and streams the final output."""
        # Ensure we have defaults
        if "rag_context" not in initial_state:
            initial_state["rag_context"] = ""
        if "next_step" not in initial_state:
            initial_state["next_step"] = ""
            
        final_state = await self.graph.ainvoke(initial_state)
        
        # Extract the final messages prepared by the generator node
        final_messages = final_state.get("final_messages", [])
        
        # Stream the LLM response
        async for chunk in llm_router.stream_completion(final_messages):
            yield chunk

orchestrator = RaymundoOrchestrator()
