// ¿El error viene de que el celular le quitó la GPU al navegador? (pantalla bloqueada,
// cambio de app, poca memoria). En ese caso WebLLM ya descargó el modelo por su cuenta.
export function esPerdidaDeGPU(e: unknown): boolean {
  const texto = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /ModelNotLoaded|Model not loaded|device (was |is )?lost|DeviceLost|mapAsync|GPUBuffer|Instance\.dispose|destroyed/i.test(texto);
}
