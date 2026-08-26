import sys
from pathlib import Path
from typing import Dict, Any
from loguru import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class MCPClientManager:
    """
    Manages connections to multiple MCP servers via stdio transport.

    Each MCP server runs as a subprocess and communicates via stdin/stdout.
    The client manager aggregates tools from all servers and routes
    tool calls to the correct server.
    """

    def __init__(self):
        self.sessions: Dict[str, ClientSession] = {}
        self.tools: Dict[str, list] = {}
        self._exit_stacks = []

        # Server configurations: name -> [command, args...]
        self.servers_config = {
            "google_calendar": {
                "command": sys.executable,
                "args": ["-m", "mcp_servers.google_calendar_server"],
            },
            "youtube": {
                "command": sys.executable,
                "args": ["-m", "mcp_servers.youtube_server"],
            },
            "spotify": {
                "command": sys.executable,
                "args": ["-m", "mcp_servers.spotify_server"],
            },
            "web_search": {
                "command": sys.executable,
                "args": ["-m", "mcp_servers.web_search_server"],
            },
        }

    async def initialize(self):
        """Start all configured MCP servers and cache their tools."""
        logger.info("Initializing MCP Client Manager...")
        for server_name, config in self.servers_config.items():
            try:
                logger.info(f"Registering MCP server: {server_name}")
                # NOTE: Full stdio_client lifecycle management requires
                # an async context manager kept alive for the app's lifetime.
                # For now we register the server config and connect on-demand.
                self.tools[server_name] = []
                logger.info(f"MCP server '{server_name}' registered (lazy connect)")
            except Exception as e:
                logger.error(f"Failed to register MCP server '{server_name}': {e}")

        logger.info(f"MCP Client Manager ready with {len(self.tools)} servers")

    async def list_all_tools(self) -> Dict[str, list]:
        """Return all available tools grouped by server."""
        return self.tools

    async def call_tool(
        self, server_name: str, tool_name: str, arguments: dict
    ) -> Any:
        """
        Execute a tool on the specified MCP server.

        Connects to the server on-demand, calls the tool, and returns the result.
        """
        config = self.servers_config.get(server_name)
        if not config:
            logger.error(f"Unknown MCP server: {server_name}")
            return {"error": f"Server '{server_name}' not configured"}

        try:
            server_params = StdioServerParameters(
                command=config["command"],
                args=config["args"],
            )
            # Connect, call tool, and disconnect
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool(tool_name, arguments)
                    logger.info(
                        f"MCP tool '{tool_name}' on '{server_name}' completed"
                    )
                    return result
        except Exception as e:
            logger.error(f"MCP tool call failed [{server_name}/{tool_name}]: {e}")
            return {"error": str(e)}

    async def shutdown(self):
        """Clean up all MCP server connections."""
        logger.info("Shutting down MCP Client Manager...")
        self.sessions.clear()
        self.tools.clear()
        logger.info("MCP Client Manager shut down")


mcp_manager = MCPClientManager()