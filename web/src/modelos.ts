// Catálogo de cerebros para Raymundo. Cada nivel tiene una variante q4f16 (más ligera,
// requiere la extensión WebGPU "shader-f16") y, cuando existe, una q4f32 de respaldo.
// Los IDs vienen de prebuiltAppConfig de @mlc-ai/web-llm 0.2.85.

export type NivelId = "ligero" | "recomendado" | "potente" | "maximo";

export interface Variante {
  modelo: string;
  nombre: string;
  vramMB: number;
  descargaMB: number;
}

export interface Nivel {
  id: NivelId;
  nombre: string;
  descripcion: string;
  soloComputadora?: boolean; // no se ofrece en celulares
  f16: Variante;
  f32?: Variante;
}

export const NIVELES: Nivel[] = [
  {
    id: "ligero",
    nombre: "Ligero",
    descripcion: "Para la mayoría de los celulares, incluyendo iPhone y gama media.",
    f16: { modelo: "gemma3-1b-it-q4f16_1-MLC", nombre: "Gemma 3 1B", vramMB: 711, descargaMB: 563 },
    f32: { modelo: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", nombre: "Qwen 2.5 0.5B", vramMB: 1060, descargaMB: 278 },
  },
  {
    id: "recomendado",
    nombre: "Recomendado",
    descripcion: "Mejores respuestas; para celulares con 6 GB de RAM o más.",
    f16: { modelo: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", nombre: "Qwen 2.5 1.5B", vramMB: 1630, descargaMB: 869 },
    f32: { modelo: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", nombre: "Qwen 2.5 1.5B", vramMB: 1889, descargaMB: 869 },
  },
  {
    id: "potente",
    nombre: "Potente",
    descripcion: "Más listo; para celulares de gama alta (8 GB de RAM o más) y computadoras.",
    f16: { modelo: "Qwen3.5-2B-q4f16_1-MLC", nombre: "Qwen 3.5 2B", vramMB: 2245, descargaMB: 1059 },
    f32: { modelo: "Qwen3.5-2B-q4f32_1-MLC", nombre: "Qwen 3.5 2B", vramMB: 2592, descargaMB: 1059 },
  },
  {
    id: "maximo",
    nombre: "Máximo",
    descripcion: "El mismo modelo que Raymundo de escritorio. Solo computadoras con GPU de 8 GB o más.",
    soloComputadora: true,
    f16: { modelo: "Qwen3.5-9B-q4f16_1-MLC", nombre: "Qwen 3.5 9B", vramMB: 6433, descargaMB: 5038 },
    f32: { modelo: "Qwen3.5-9B-q4f32_1-MLC", nombre: "Qwen 3.5 9B", vramMB: 7545, descargaMB: 5038 },
  },
];

export function nivelesPara(d: Dispositivo): Nivel[] {
  return NIVELES.filter((n) => !n.soloComputadora || !d.movil);
}

export interface Dispositivo {
  webgpu: boolean;
  f16: boolean;
  ramGB?: number; // navigator.deviceMemory (solo Chrome; tope de 8)
  movil: boolean;
  ios: boolean;
  gpu?: string;
  motivo?: string; // por qué no hay WebGPU, si aplica
}

export async function detectarDispositivo(): Promise<Dispositivo> {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const movil = ios || /Android|Mobile/i.test(ua);
  const ramGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const base = { movil, ios, ramGB };

  if (!window.isSecureContext) {
    return {
      ...base,
      webgpu: false,
      f16: false,
      motivo: "Esta página se abrió de una forma en la que el navegador no deja usar la GPU. Ábrela desde un enlace https:// o, en computadora, abre el archivo directo con Chrome o Edge.",
    };
  }
  if (!("gpu" in navigator) || !navigator.gpu) {
    return { ...base, webgpu: false, f16: false, motivo: "Este navegador no tiene WebGPU." };
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { ...base, webgpu: false, f16: false, motivo: "No se encontró una GPU compatible." };
    const info = (adapter as GPUAdapter & { info?: GPUAdapterInfo }).info;
    return {
      ...base,
      webgpu: true,
      f16: adapter.features.has("shader-f16"),
      gpu: info ? [info.vendor, info.architecture].filter(Boolean).join(" ") : undefined,
    };
  } catch (e) {
    return { ...base, webgpu: false, f16: false, motivo: String(e) };
  }
}

export function nivelSugerido(d: Dispositivo): NivelId {
  // iOS no reporta RAM y Safari corta las pestañas que usan mucha memoria: mejor ir a la segura.
  if (d.ios) return "ligero";
  if (d.ramGB === undefined) return d.movil ? "ligero" : "recomendado";
  if (d.ramGB >= 8 && !d.movil) return "potente";
  if (d.ramGB >= 6) return "recomendado";
  return "ligero";
}

export function varianteDe(nivel: Nivel, d: Dispositivo): Variante {
  return d.f16 || !nivel.f32 ? nivel.f16 : nivel.f32;
}

export function buscarNivel(id: string | null | undefined): Nivel {
  return NIVELES.find((n) => n.id === id) ?? NIVELES[0];
}
