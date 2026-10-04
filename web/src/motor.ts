import { deleteModelAllInfoInCache, hasModelInCache, type InitProgressReport, type MLCEngineInterface } from "@mlc-ai/web-llm";
import { armarMensajes } from "./contexto";
import { APP_CONFIG, crearMotor } from "./crear-motor";
import type { Mensaje } from "./persona";

let motor: MLCEngineInterface | null = null;
let liberarMotor: () => void = () => {};
let modeloCargado: string | null = null;

export function modeloActual() {
  return modeloCargado;
}

// Cuando el celular le quita la GPU al navegador (pantalla bloqueada, cambio de app, poca
// memoria), WebLLM descarga el modelo sin avisar: solo lo escribe en la consola. Guardamos
// ese motivo para poder mostrarlo.
let motivoPerdida: string | null = null;
const errorOriginal = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const texto = args.map(String).join(" ");
  if (/device (was )?lost/i.test(texto)) motivoPerdida = texto;
  errorOriginal(...args);
};

export function ultimoMotivoPerdida() {
  return motivoPerdida;
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

export async function estaDescargado(modelo: string): Promise<boolean> {
  try {
    return await hasModelInCache(modelo, APP_CONFIG);
  } catch {
    return false;
  }
}

export async function cargar(modelo: string, progreso: (r: InitProgressReport) => void): Promise<void> {
  if (motor && modeloCargado === modelo) return;
  // Pedimos almacenamiento persistente para que el sistema no borre el modelo al rato.
  navigator.storage?.persist?.().catch(() => {});
  motivoPerdida = null;

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

export async function borrarDescarga(modelo: string): Promise<void> {
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
): Promise<ResultadoGeneracion> {
  if (!motor) throw new Error("Model not loaded: el modelo todavía no está cargado.");
  interrumpido = false;
  const inicio = performance.now();

  const flujo = await motor.chat.completions.create({
    messages: armarMensajes(historial, maxTokens),
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: maxTokens,
    // Un poco más baja que en escritorio: los modelos chicos inventan más con temperatura alta.
    temperature: 0.6,
    top_p: 0.9,
    frequency_penalty: 0.3,
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
}
