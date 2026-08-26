from mcp.server.fastmcp import FastMCP
import httpx
from bs4 import BeautifulSoup

mcp = FastMCP("WebSearch")

@mcp.tool()
def search_web(query: str, num_results: int = 5) -> list:
    """
    Busca información en la web utilizando DuckDuckGo (mock).
    """
    # En producción usar duckduckgo-search o api
    return [
        {"title": f"Resultado {i} para {query}", "url": "https://example.com", "snippet": "Extracto mock del resultado web."}
        for i in range(num_results)
    ]

@mcp.tool()
def extract_page_content(url: str) -> str:
    """
    Extrae el texto principal de una página web a partir de su URL.
    """
    # Implementación básica para scraping
    try:
        response = httpx.get(url, timeout=10.0)
        soup = BeautifulSoup(response.text, 'html.parser')
        # Remover scripts y styles
        for script in soup(["script", "style"]):
            script.decompose()
        text = soup.get_text(separator=' ', strip=True)
        return text[:5000] # Limitar a 5000 caracteres
    except Exception as e:
        return f"Error al extraer contenido: {e}"

if __name__ == "__main__":
    mcp.run()
