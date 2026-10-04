import type { Mensaje } from "./persona";
import type { Segmento } from "./texto";

// Un mensaje de la plática. `content` es lo que ve el modelo; `mostrar` es lo que ve
// el usuario cuando difieren (p. ej. "/email ..." se le manda al modelo ya como instrucción).
export interface Entrada extends Mensaje {
  role: "user" | "assistant";
  mostrar?: string;
  stats?: string;
  local?: boolean; // respuesta generada sin el modelo (/ayuda, /reset): no se le reenvía
}

const CLAVE = "raygpt.historial.v1";

export function cargarHistorial(): Entrada[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const datos = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

export function guardarHistorial(h: Entrada[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(h.slice(-200)));
  } catch {
    // Sin espacio o modo privado: la plática sigue en memoria y ya.
  }
}

// Guardamos la respuesta ya limpia: así el modelo ve su propio estilo "bien hecho"
// en los turnos siguientes y se le pega más el formato de Raymundo.
export function serializar(segmentos: Segmento[]): string {
  return segmentos
    .map((s) => (s.tipo === "codigo" ? "```" + s.lenguaje + "\n" + s.contenido + "\n```" : s.contenido))
    .join("\n\n");
}

export function paraModelo(h: Entrada[]): Mensaje[] {
  return h.filter((e) => !e.local).map(({ role, content }) => ({ role, content }));
}

export const preferencias = {
  leer(clave: string): string | null {
    try {
      return localStorage.getItem("raygpt." + clave);
    } catch {
      return null;
    }
  },
  escribir(clave: string, valor: string) {
    try {
      localStorage.setItem("raygpt." + clave, valor);
    } catch {
      /* sin almacenamiento */
    }
  },
};
