import { deleteModelAllInfoInCache, hasModelInCache, type InitProgressReport, type MLCEngineInterface } from "@mlc-ai/web-llm";
import { armarMensajes } from "./contexto";
import { APP_CONFIG, crearMotor } from "./crear-motor";
import {
  borrarDescargaCPU,
  cargarCPU,
  detenerCPU,
  estaDescargadoCPU,
  generarCPU,
  hilosCPU,
  liberarCPU,
  modeloCPU,
} from "./motor-cpu";
import type { Mensaje, Personalidad } from "./persona";

let motor: MLCEngineInterface | null = null;
let liberarMotor: () => void = () => {};
let modeloCargado: string | null = null;

export function modeloActual() {
  return modeloCargado ?? modeloCPU();
}

export { hilosCPU };

// Cuando el celular le quita la GPU al navegador (pantalla bloqueada, cambio de app, poca
// memoria), WebLLM descarga el modelo sin avisar: solo lo escribe en la consola. Guardamos
// ese motivo para poder mostrarlo.
let motivoPerdida: string | null = null;
let motivoGPU: string | null = null;
const errorOriginal = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const texto = args.map(String).join(" ");
  if (/device (was )?lost/i.test(texto)) motivoPerdida = texto;
  errorOriginal(...args);
};

// WebLLM imprime el motivo como "[object GPUDeviceLostInfo]" y se pierde. Envolvemos
// requestDevice para escuchar nosotros mismos device.lost y guardar reason + message.
// (Solo alcanza al motor que corre en esta página: la versión de un solo HTML.)
if (typeof GPUAdapter !== "undefined") {
  const requestDevice = GPUAdapter.prototype.requestDevice;
  GPUAdapter.prototype.requestDevice = async function (this: GPUAdapter, ...args: Parameters<GPUAdapter["requestDevice"]>) {
    const device = await requestDevice.apply(this, args);
    device.lost.then((info) => {
      if (info.reason !== "destroyed") motivoGPU = `${info.reason ?? "unknown"}: ${info.message || "(sin mensaje)"}`;
    });
    return device;
  };
}

export function ultimoMotivoPerdida() {
  return motivoGPU ?? motivoPerdida;
}

// Modelos chicos (todo menos Máximo) usan el prompt compacto.
export function usaPromptCompacto(modelo = modeloCargado) {
  return !/-9B-/i.test(modelo ?? "") || !!modeloCPU();
}

export { esPerdidaDeGPU } from "./errores";

// Tira el motor actual (con su GPU muerta) para que el siguiente `cargar` empiece de cero.
export async function reiniciar(): Promise<void> {
  const viejo = motor;
  const liberar = liberarMotor;
  motor = null;
  liberarMotor = () => {};
  modeloCargado = null;
  try {
    await viejo?.unload();
  } catch {
    /* ya estaba muerto */
  }
  liberar();
}

// Los modelos para procesador se identifican por su URL (.gguf); los de GPU, por su ID de WebLLM.
export const esModeloCPU = (modelo: string | null | undefined) => !!modelo && modelo.startsWith("http");

export async function estaDescargado(modelo: string): Promise<boolean> {
  if (esModeloCPU(modelo)) return estaDescargadoCPU(modelo);
  try {
    return await hasModelInCache(modelo, APP_CONFIG);
  } catch {
    return false;
  }
}

export async function cargar(modelo: string, progreso: (r: InitProgressReport) => void): Promise<void> {
  // Pedimos almacenamiento persistente para que el sistema no borre el modelo al rato.
  navigator.storage?.persist?.().catch(() => {});

  if (esModeloCPU(modelo)) {
    if (motor) await reiniciar(); // soltamos la GPU: solo un modelo en memoria a la vez
    await cargarCPU(modelo, (f, texto) => progreso({ progress: f, timeElapsed: 0, text: `RAY:${texto}` }));
    return;
  }
  await liberarCPU();
  if (motor && modeloCargado === modelo) return;
  motivoPerdida = null;
  motivoGPU = null;

  if (!motor) {
    ({ motor, liberar: liberarMotor } = await crearMotor(modelo, progreso));
  } else {
    motor.setInitProgressCallback(progreso);
    try {
      await motor.reload(modelo);
    } catch (e) {
      await reiniciar();
      throw e;
    }
  }
  modeloCargado = modelo;
}

// Modelos que ya no están en el catálogo: si quedaron en el dispositivo, se borran solos
// (ya no aparecen en Ajustes y ocupan espacio que al celular le hace falta).
const RETIRADOS = ["Qwen2.5-1.5B-Instruct-q4f16_1-MLC", "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", "Qwen2.5-0.5B-Instruct-q4f32_1-MLC"];

export async function limpiarRetirados(): Promise<void> {
  for (const modelo of RETIRADOS) {
    try {
      if (await hasModelInCache(modelo, APP_CONFIG)) await deleteModelAllInfoInCache(modelo, APP_CONFIG);
    } catch {
      /* si no se puede, no pasa nada */
    }
  }
}

export async function borrarDescarga(modelo: string): Promise<void> {
  if (esModeloCPU(modelo)) return borrarDescargaCPU(modelo);
  if (motor && modeloCargado === modelo) await reiniciar();
  await deleteModelAllInfoInCache(modelo, APP_CONFIG);
}

export interface ResultadoGeneracion {
  texto: string;
  tokens?: number;
  segundos: number;
  interrumpido: boolean;
}

let interrumpido = false;

export async function generar(
  historial: Mensaje[],
  alRecibir: (acumulado: string) => void,
  maxTokens = 512,
  personalidad: Personalidad = "raymundo",
): Promise<ResultadoGeneracion> {
  const inicio = performance.now();
  if (modeloCPU()) {
    const r = await generarCPU(armarMensajes(historial, maxTokens, personalidad, true), alRecibir, {
      maxTokens,
      temperatura: 0.6,
    });
    return { ...r, segundos: (performance.now() - inicio) / 1000 };
  }
  if (!motor) throw new Error("Model not loaded: el modelo todavía no está cargado.");
  interrumpido = false;

  const flujo = await motor.chat.completions.create({
    messages: armarMensajes(historial, maxTokens, personalidad, usaPromptCompacto()),
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: maxTokens,
    // Los modelos chicos se desvarían con temperatura alta; rAI en el grande sí va más alto
    // para que la carrilla salga variada. Sin frequency_penalty: en español castiga
    // "que", "de", "la"… y a un modelo chico le rompe la gramática.
    temperature: personalidad === "rai" && !usaPromptCompacto() ? 0.8 : 0.6,
    top_p: 0.9,
    // Qwen3/3.5 "piensan" antes de contestar; en el celular eso sólo gasta batería.
    // Sólo a ellos: WebLLM le mete un bloque <think> vacío a cualquier modelo que lo reciba.
    ...(/^Qwen3/i.test(modeloCargado ?? "") ? { extra_body: { enable_thinking: false } } : {}),
  });

  let texto = "";
  let tokens: number | undefined;
  for await (const chunk of flujo) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      texto += delta;
      alRecibir(texto);
    }
    if (chunk.usage) tokens = chunk.usage.completion_tokens;
  }

  return { texto, tokens, segundos: (performance.now() - inicio) / 1000, interrumpido };
}

export function detener() {
  interrumpido = true;
  motor?.interruptGenerate();
  detenerCPU();
}
