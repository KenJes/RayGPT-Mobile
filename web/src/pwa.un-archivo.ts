// En el HTML suelto no hay PWA, pero sí un service worker mínimo (coi-sw.js) que agrega los
// encabezados COOP/COEP. Sin ellos el navegador no deja usar SharedArrayBuffer y el modo
// procesador (wllama) corre con un solo núcleo: 3–4 veces más lento en un celular.
// GitHub Pages no deja configurar encabezados, por eso se hace desde el service worker.
export function registrarPWA() {
  if (window.crossOriginIsolated || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker
    .register("coi-sw.js")
    .then(() => {
      // Una sola recarga por sesión, para no ciclarse en navegadores que no lo soportan.
      let yaRecargo = false;
      try {
        yaRecargo = sessionStorage.getItem("raygpt.coi") === "1";
      } catch {
        return;
      }
      if (yaRecargo) return;
      const recargar = () => {
        try {
          sessionStorage.setItem("raygpt.coi", "1");
        } catch {
          return;
        }
        location.reload();
      };
      if (navigator.serviceWorker.controller) recargar();
      else navigator.serviceWorker.addEventListener("controllerchange", recargar, { once: true });
    })
    .catch(() => {});
}
