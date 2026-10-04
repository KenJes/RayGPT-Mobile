// Limpieza de la salida del modelo. Los modelos pequeños se les "escapa" el markdown
// y uno que otro españolismo aunque el prompt diga que no; aquí lo corregimos sin
// gastar ni un token extra. Todo es puro (sin DOM) para poder probarlo.

export type Segmento = { tipo: "texto"; contenido: string } | { tipo: "codigo"; lenguaje: string; contenido: string };

// Quita el razonamiento interno (<think>…</think>) de modelos tipo Qwen3.
// Si el bloque sigue abierto (streaming), se oculta todo lo que viene después.
export function quitarPensamiento(t: string): string {
  let r = t.replace(/<think>[\s\S]*?<\/think>\s*/g, "");
  const abierto = r.indexOf("<think>");
  if (abierto !== -1) r = r.slice(0, abierto);
  return r;
}

export function limpiarMarkdown(t: string): string {
  return (
    t
      // [texto](url) -> texto (url)
      .replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g, "$1 ($2)")
      // encabezados, citas y separadores
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
      .replace(/^[ \t]*>[ \t]?/gm, "")
      .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, "")
      // viñetas -> renglones normales (las listas numeradas se respetan)
      .replace(/^[ \t]*[-*+•][ \t]+/gm, "")
      // negritas, cursivas y código en línea
      .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
      .replace(/__([^_\n]+?)__/g, "$1")
      .replace(/(^|[^\w*])\*(?=\S)([^*\n]+?)\*(?!\w)/g, "$1$2")
      .replace(/`([^`\n]+)`/g, "$1")
      // restos de marcadores a medio escribir durante el streaming
      .replace(/\*{2,}/g, "")
      .replace(/\n{3,}/g, "\n\n")
  );
}

function conMismaMayuscula(original: string, reemplazo: string): string {
  if (original === original.toUpperCase() && original.length > 1) return reemplazo.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return reemplazo[0].toUpperCase() + reemplazo.slice(1);
  return reemplazo;
}

// Palabras de otros países que se le cuelan al modelo -> español de México.
const REGIONALISMOS: Array<[RegExp, string | ((m: string, ...g: string[]) => string)]> = [
  [/\bcoches\b/gi, (m) => conMismaMayuscula(m, "carros")],
  [/\bcoche\b/gi, (m) => conMismaMayuscula(m, "carro")],
  [/\bordenadores\b/gi, (m) => conMismaMayuscula(m, "computadoras")],
  [/\bordenador\b/gi, (m) => conMismaMayuscula(m, "computadora")],
  [/\bguay\b/gi, (m) => conMismaMayuscula(m, "chido")],
  [/\b(el|tu|mi|su|un|del|al)\s+móvil\b/gi, (_m, art) => `${art} celular`],
  [/\b(los|tus|mis|sus|unos)\s+móviles\b/gi, (_m, art) => `${art} celulares`],
  // Voseo argentino que a veces se les escapa a los modelos chicos.
  [/\bsabés\b/gi, (m) => conMismaMayuscula(m, "sabes")],
  [/\btenés\b/gi, (m) => conMismaMayuscula(m, "tienes")],
  [/\bquerés\b/gi, (m) => conMismaMayuscula(m, "quieres")],
  [/\bpodés\b/gi, (m) => conMismaMayuscula(m, "puedes")],
  [/\bhacés\b/gi, (m) => conMismaMayuscula(m, "haces")],
  [/\bdecís\b/gi, (m) => conMismaMayuscula(m, "dices")],
  [/\bsos\b/g, "eres"],
  // "Vale, ..." al inicio de una frase -> "Sale, ..."
  [/(^|[.!?¡¿]\s+)Vale([,.!])/g, (_m, antes, signo) => `${antes}Sale${signo}`],
];

export function mexicanizar(t: string): string {
  let r = t;
  for (const [patron, reemplazo] of REGIONALISMOS) r = r.replace(patron, reemplazo as never);
  return r;
}

// Convierte la salida cruda del modelo en segmentos listos para pintar.
// Funciona con texto incompleto: un ``` sin cerrar se trata como código hasta el final.
export function procesarRespuesta(crudo: string): Segmento[] {
  const texto = quitarPensamiento(crudo);
  const segmentos: Segmento[] = [];
  const partes = texto.split(/```/);

  partes.forEach((parte, i) => {
    if (i % 2 === 0) {
      const limpio = mexicanizar(limpiarMarkdown(parte)).replace(/^\n+|\n+$/g, "");
      if (limpio.trim()) segmentos.push({ tipo: "texto", contenido: limpio });
    } else {
      const salto = parte.indexOf("\n");
      const primera = salto === -1 ? parte : parte.slice(0, salto);
      const tieneLenguaje = /^[\w+#.-]*$/.test(primera.trim());
      const lenguaje = tieneLenguaje ? primera.trim() : "";
      const contenido = (tieneLenguaje && salto !== -1 ? parte.slice(salto + 1) : tieneLenguaje ? "" : parte).replace(/\n+$/, "");
      segmentos.push({ tipo: "codigo", lenguaje, contenido });
    }
  });

  return segmentos;
}

// Texto plano (para copiar o para leerlo en voz alta).
export function textoPlano(segmentos: Segmento[], incluirCodigo = true): string {
  return segmentos
    .filter((s) => incluirCodigo || s.tipo === "texto")
    .map((s) => s.contenido)
    .join("\n\n");
}
