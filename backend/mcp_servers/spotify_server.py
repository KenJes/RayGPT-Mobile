from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Spotify")

@mcp.tool()
def play_track(query: str) -> dict:
    """
    Busca y reproduce una canción en Spotify.
    """
    return {"status": "playing", "track": query, "artist": "Mock Artist"}

@mcp.tool()
def pause() -> dict:
    """
    Pausa la reproducción actual.
    """
    return {"status": "paused"}

@mcp.tool()
def next_track() -> dict:
    """
    Salta a la siguiente canción.
    """
    return {"status": "playing", "track": "Next Mock Track", "artist": "Mock Artist"}

@mcp.tool()
def previous_track() -> dict:
    """
    Regresa a la canción anterior.
    """
    return {"status": "playing", "track": "Previous Mock Track", "artist": "Mock Artist"}

@mcp.tool()
def current_playback() -> dict:
    """
    Obtiene la información de la reproducción actual.
    """
    return {"track": "Current Mock Track", "artist": "Mock Artist", "album": "Mock Album", "progress": 50}

@mcp.tool()
def search_tracks(query: str, limit: int = 5) -> list:
    """
    Busca canciones en Spotify sin reproducirlas.
    """
    return [{"name": f"Track {i}", "artist": "Artist", "url": "spotify:track:mock"} for i in range(limit)]

if __name__ == "__main__":
    mcp.run()
