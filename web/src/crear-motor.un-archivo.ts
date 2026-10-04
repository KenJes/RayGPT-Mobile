// Versión de un solo HTML: sin Web Worker (no se puede empaquetar junto) y con los pesos
// en IndexedDB, que también funciona cuando el archivo se abre directo desde el disco.
import { CreateMLCEngine, prebuiltAppConfig, type AppConfig, type InitProgressCallback, type MLCEngineInterface } from "@mlc-ai/web-llm";

export const APP_CONFIG: AppConfig = { ...prebuiltAppConfig, cacheBackend: "indexeddb" };

export async function crearMotor(
  modelo: string,
  progreso: InitProgressCallback,
): Promise<{ motor: MLCEngineInterface; liberar: () => void }> {
  const motor = await CreateMLCEngine(modelo, { initProgressCallback: progreso, appConfig: APP_CONFIG });
  return { motor, liberar: () => {} };
}
