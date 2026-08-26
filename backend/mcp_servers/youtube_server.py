from mcp.server.fastmcp import FastMCP

mcp = FastMCP("YouTube")

@mcp.tool()
def search_videos(query: str, max_results: int = 5) -> list:
    """
    Busca videos en YouTube.
    Devuelve una lista de {title, url, channel, views}
    """
    # Mock implementation
    return [
        {"title": f"Video sobre {query}", "url": "https://youtube.com/watch?v=mock", "channel": "Mock Channel", "views": 1000}
    ]

@mcp.tool()
def get_video_info(video_url: str) -> dict:
    """
    Obtiene la información detallada de un video a partir de su URL.
    """
    return {
        "title": "Mock Video",
        "description": "Descripción del video mock.",
        "duration": "10:00",
        "channel": "Mock Channel"
    }

if __name__ == "__main__":
    mcp.run()
