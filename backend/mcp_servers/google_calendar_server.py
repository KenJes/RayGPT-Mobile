from mcp.server.fastmcp import FastMCP
import datetime

mcp = FastMCP("GoogleCalendar")

@mcp.tool()
def create_event(title: str, date: str, time: str, duration_minutes: int, description: str) -> str:
    """
    Crea un nuevo evento en Google Calendar.
    - title: Título del evento
    - date: Fecha (ej: 'hoy', 'mañana', '2023-10-25')
    - time: Hora (ej: '14:30')
    - duration_minutes: Duración en minutos
    - description: Descripción
    """
    # Mock implementation
    return f"https://calendar.google.com/calendar/event?eid=mock_{title.replace(' ', '_')}"

@mcp.tool()
def list_events(date_from: str, date_to: str) -> list:
    """
    Lista los eventos agendados en un rango de fechas.
    """
    return [{"title": "Reunión de equipo", "start": f"{date_from}T10:00:00", "end": f"{date_from}T11:00:00"}]

@mcp.tool()
def delete_event(event_id: str) -> bool:
    """
    Elimina un evento por su ID.
    """
    return True

if __name__ == "__main__":
    mcp.run()
