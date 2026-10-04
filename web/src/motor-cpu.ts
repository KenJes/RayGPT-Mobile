// Motor de respaldo en el procesador (CPU) con llama.cpp compilado a WebAssembly (wllama).
// Es más lento que la GPU, pero funciona en casi cualquier celular: lo usamos cuando no hay
// WebGPU o cuando el driver de la GPU truena (p. ej. Adreno 6xx: VK_ERROR_DEVICE_LOST).
import { Wllama, WllamaAbortError } from "@wllama/wllama";
import type { Mensaje } from "./persona";

// El .wasm (~9 MB) viene del CDN para no inflar el HTML; el navegador lo guarda en caché.
const RUTAS = { default: "https://cdn.jsdelivr.net/npm/@wllama/wllama@3.8.1/src/wasm/wllama.wasm" };

let wllama: Wllama | null = null;
let cargado: string | null = null;
let abortador: AbortController | null = null;

const nueva = () => new Wllama(RUTAS, { allowOffline: true, suppressNativeLog: true });

export function modeloCPU() {
  return cargado;
}

export function hilosCPU(): number {
  return wllama?.isModelLoaded() ? wllama.getNumThreads() : 0;
}

export async function estaDescargadoCPU(url: string): Promise<boolean> {
  try {
    const cm = (wllama ?? nueva()).cacheManager;
    const nombre = await cm.getNameFromURL(url);
    return (await cm.list()).some((e) => e.name === nombre);
  } catch {
    return false;
  }
}

export async function cargarCPU(url: string, progreso: (fraccion: number, texto: string) => void): Promise<void> {
  if (wllama?.isModelLoaded() && cargado === url) return;
  await liberarCPU();
  const yaEstaba = await estaDescargadoCPU(url);
  wllama = nueva();
  await wllama.loadModelFromUrl(url, {
    n_ctx: 4096,
    n_gpu_layers: 0, // solo procesador: la idea es no tocar la GPU
    jinja: true, // plantilla oficial del modelo (permite apagar el "pensamiento" de Qwen 3.5)
    useCache: true,
    progressCallback: ({ loaded, total }) => {
      const f = total ? loaded / total : 0;
      const mb = Math.round(loaded / 1e6);
      progreso(f, `${yaEstaba ? "Leyendo del dispositivo" : "Descargando"} ${Math.round(f * 100)}% · ${mb} MB`);
    },
  });
  progreso(1, "¡Listo!");
  cargado = url;
}

export async function liberarCPU(): Promise<void> {
  const w = wllama;
  wllama = null;
  cargado = null;
  try {
    if (w?.isModelLoaded()) await w.exit();
  } catch {
    /* ya estaba cerrado */
  }
}

export async function borrarDescargaCPU(url: string): Promise<void> {
  if (cargado === url) await liberarCPU();
  await (wllama ?? nueva()).cacheManager.delete(url);
}

export interface OpcionesCPU {
  maxTokens: number;
  temperatura: number;
}

export async function generarCPU(
  mensajes: Mensaje[],
  alRecibir: (acumulado: string) => void,
  { maxTokens, temperatura }: OpcionesCPU,
): Promise<{ texto: string; tokens: number; interrumpido: boolean }> {
  if (!wllama?.isModelLoaded()) throw new Error("Model not loaded: el modelo para procesador no está cargado.");
  abortador = new AbortController();
  let texto = "";
  let tokens = 0;
  try {
    const flujo = await wllama.createChatCompletion({
      messages: mensajes,
      stream: true,
      max_tokens: maxTokens,
      temperature: temperatura,
      top_p: 0.9,
      abortSignal: abortador.signal,
      // Qwen 3.5 "piensa" antes de contestar; en el procesador eso tarda muchísimo.
      chat_template_kwargs: { enable_thinking: false },
    });
    for await (const chunk of flujo) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        texto += delta;
        tokens++;
        alRecibir(texto);
      }
    }
    return { texto, tokens, interrumpido: false };
  } catch (e) {
    if (e instanceof WllamaAbortError || (e instanceof Error && e.name === "AbortError")) {
      return { texto, tokens, interrumpido: true };
    }
    throw e;
  } finally {
    abortador = null;
  }
}

export function detenerCPU() {
  abortador?.abort();
}
