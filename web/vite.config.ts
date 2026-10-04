import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";

const src = fileURLToPath(new URL("./src/", import.meta.url));

// Service worker que agrega COOP/COEP a las páginas (ver src/pwa.un-archivo.ts).
// "credentialless" deja seguir bajando modelos y scripts de otros dominios con CORS.
const COI_SW = `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.mode !== "navigate" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res.status === 0) return res;
      const h = new Headers(res.headers);
      h.set("Cross-Origin-Embedder-Policy", "credentialless");
      h.set("Cross-Origin-Opener-Policy", "same-origin");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }),
  );
});
`;

// `vite build --mode un-archivo` genera raymundo.html: todo (app + WebLLM) en un solo
// archivo para compartirlo. Cada quien descarga el modelo la primera vez que lo abre.
function unArchivo(): Plugin[] {
  const icono = readFileSync(new URL("./public/icons/icon.svg", import.meta.url));
  const iconoDataUri = `data:image/svg+xml;base64,${icono.toString("base64")}`;
  const outDir = fileURLToPath(new URL("./dist-compartir/", import.meta.url));
  return [
    viteSingleFile({ removeViteModuleLoader: true }),
    {
      name: "raymundo-un-archivo",
      transformIndexHtml: (html) =>
        html
          .replaceAll("icons/icon.svg", iconoDataUri)
          .replace(/^\s*<link rel="apple-touch-icon"[^>]*>\n/m, ""),
      closeBundle() {
        renameSync(outDir + "index.html", outDir + "raymundo.html");
        writeFileSync(outDir + "coi-sw.js", COI_SW);
        // Para que la raíz del sitio (GitHub Pages) abra raymundo.html.
        writeFileSync(
          outDir + "index.html",
          '<!DOCTYPE html>\n<meta http-equiv="refresh" content="0; url=raymundo.html">\n<link rel="canonical" href="raymundo.html">\n<script>location.replace("raymundo.html")</script>\n',
        );
      },
    },
  ];
}

export default defineConfig(({ mode }) => {
  const esUnArchivo = mode === "un-archivo";
  return {
    // En GitHub Pages la app vive en /RayGPT-Mobile/; en local, en la raíz.
    base: esUnArchivo ? "./" : (process.env.BASE_PATH ?? "/"),
    worker: { format: "es" },
    resolve: {
      // Las piezas que cambian entre la PWA y el HTML suelto.
      alias: esUnArchivo ? [{ find: /^\.\/(crear-motor|pwa)$/, replacement: `${src}$1.un-archivo.ts` }] : [],
    },
    build: {
      target: "es2022",
      chunkSizeWarningLimit: 8000,
      ...(esUnArchivo ? { outDir: "dist-compartir", copyPublicDir: false } : {}),
    },
    plugins: esUnArchivo
      ? unArchivo()
      : [
          VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icons/*.svg", "icons/*.png"],
            manifest: {
              name: "RayGPT — Raymundo",
              short_name: "Raymundo",
              description: "Raymundo, creado por Kenneth Alcalá, corriendo 100% en tu celular. Sin nube, sin tokens.",
              lang: "es-MX",
              start_url: ".",
              scope: ".",
              display: "standalone",
              orientation: "portrait",
              background_color: "#0b1220",
              theme_color: "#0b1220",
              icons: [
                { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
                { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
              ],
            },
            workbox: {
              // El bundle de WebLLM pesa ~6 MB; los pesos del modelo los guarda WebLLM en su propio caché.
              maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
              globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
              navigateFallback: "index.html",
            },
          }),
        ],
  };
});
