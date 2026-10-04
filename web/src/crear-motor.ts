// Versión PWA: el modelo corre en un Web Worker y los pesos van a la Cache API.
// La versión de un solo archivo usa crear-motor.un-archivo.ts (ver vite.config.ts).
import { CreateWebWorkerMLCEngine, prebuiltAppConfig, type AppConfig, type InitProgressCallback, type MLCEngineInterface } from "@mlc-ai/web-llm";

export const APP_CONFIG: AppConfig = prebuiltAppConfig;

export async function crearMotor(
  modelo: string,
  progreso: InitProgressCallback,
): Promise<{ motor: MLCEngineInterface; liberar: () => void }> {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  try {
    const motor = await CreateWebWorkerMLCEngine(worker, modelo, { initProgressCallback: progreso, appConfig: APP_CONFIG });
    return { motor, liberar: () => worker.terminate() };
  } catch (e) {
    worker.terminate();
    throw e;
  }
}
