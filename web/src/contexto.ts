import { promptDe, type Mensaje, type Personalidad } from "./persona";

// Los modelos del catálogo tienen ventana de 4096 tokens. Reservamos espacio para
// la respuesta y recortamos la plática más vieja cuando ya no cabe.
export const VENTANA_TOKENS = 4096;

// Aproximación barata: en español un token anda por los 3–4 caracteres.
export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 3.2) + 4;
}

export function armarMensajes(
  historial: Mensaje[],
  maxRespuesta: number,
  personalidad: Personalidad = "raymundo",
  compacto = false,
  ventana = VENTANA_TOKENS,
): Mensaje[] {
  const { sistema, ejemplos } = promptDe(personalidad, compacto);
  const fijos: Mensaje[] = [{ role: "system", content: sistema }, ...ejemplos];
  let disponible = ventana - maxRespuesta - fijos.reduce((n, m) => n + estimarTokens(m.content), 0);

  const elegidos: Mensaje[] = [];
  for (let i = historial.length - 1; i >= 0; i--) {
    const costo = estimarTokens(historial[i].content);
    // El último mensaje del usuario siempre va, aunque haya que recortarlo.
    if (elegidos.length === 0) {
      const maxChars = Math.max(200, Math.floor(disponible * 3.2));
      elegidos.unshift({ ...historial[i], content: historial[i].content.slice(-maxChars) });
      disponible -= Math.min(costo, disponible);
      continue;
    }
    if (costo > disponible) break;
    elegidos.unshift(historial[i]);
    disponible -= costo;
  }

  // La plática debe empezar con el usuario para que la plantilla del modelo no truene.
  while (elegidos.length > 1 && elegidos[0].role !== "user") elegidos.shift();
  return [...fijos, ...elegidos];
}
