# RayGPT Mobile 3.0 — Raymundo en tu celular

Raymundo, el asistente creado por Kenneth Alcalá, corriendo **100% en el dispositivo** con [WebLLM](https://github.com/mlc-ai/web-llm) y WebGPU. Sin servidor, sin nube, sin API keys y sin gastar tokens: el modelo se descarga una vez, se guarda en el navegador y después funciona sin internet.

Es una PWA: se abre desde el navegador y se puede instalar en la pantalla de inicio como si fuera app.

## Qué hace

- Plática con streaming en español de México, con la personalidad de Raymundo.
- Comandos: `/resumir`, `/traducir`, `/email`, `/codigo`, `/reset` (`/borrar`, `/limpiar`) y `/ayuda`. `/reset` y `/ayuda` se resuelven sin tocar el modelo.
- Elige solo el modelo según el equipo (WebGPU, `shader-f16` y RAM) y deja cambiarlo o borrarlo en Ajustes.
- Limpia la salida del modelo: quita markdown, oculta bloques `<think>` y corrige españolismos (coche → carro, móvil → celular…). Solo el código conserva su bloque, con botón de copiar.
- Voz: lee las respuestas con las voces del sistema (prefiere una voz masculina es-MX) y deja dictar con el micrófono.
- Guarda la plática en el dispositivo y recorta lo más viejo para no pasarse de la ventana de 4096 tokens.

## Modelos

| Nivel | Con `shader-f16` | Sin `shader-f16` | Descarga aprox. | Para quién |
|---|---|---|---|---|
| Ligero | Gemma 3 1B | Qwen 2.5 0.5B | 280–560 MB | La mayoría de celulares, iPhone |
| Recomendado | Qwen 2.5 1.5B | Qwen 2.5 1.5B (f32) | ~870 MB | 6 GB de RAM o más |
| Potente | Qwen 3.5 2B | Qwen 3.5 2B (f32) | ~1.1 GB | Gama alta, computadora |

En iPhone siempre se sugiere Ligero porque Safari cierra las pestañas que usan mucha memoria.

## Requisitos del dispositivo

- **Android:** Chrome 121 o más nuevo (Android 12+, GPU Qualcomm/ARM).
- **iPhone/iPad:** Safari con iOS 26 o más nuevo.
- **Computadora:** Chrome, Edge o Safari recientes.

WebGPU solo funciona en un contexto seguro: `https://` o `localhost`.

## Desarrollo

```bash
cd web
npm install
npm run dev      # http://localhost:5173 (y en tu red local con --host)
npm test         # pruebas de limpieza de texto, comandos y contexto
npm run build    # genera dist/ con service worker
npm run icons    # regenera los PNG desde public/icons/icon.svg
```

Para probar en el celular necesitas HTTPS. Lo más fácil es publicar en GitHub Pages (abajo) o usar un túnel como `cloudflared tunnel --url http://localhost:5173`.

## Versión de un solo archivo (para compartir)

```bash
npm run build:html   # genera dist-compartir/raymundo.html (~6 MB, todo incluido)
```

`raymundo.html` trae la app y WebLLM adentro; no depende de ningún servidor. Cada persona que lo abre elige su modelo, lo descarga una vez (se guarda en IndexedDB de su navegador) y de ahí en adelante lo usa por su cuenta, sin internet. La plática de cada quien se queda en su dispositivo.

Diferencias contra la PWA: el modelo corre en la página (sin Web Worker) y no hay service worker. Usa el mismo código, así que cualquier cambio a la personalidad aplica a las dos versiones.

Dónde funciona:

- **Computadora:** doble clic al archivo y se abre en Chrome o Edge. Listo.
- **Celular:** los navegadores móviles no dejan usar la GPU desde un archivo descargado. Súbelo a cualquier hosting estático con `https://` (GitHub Pages, Netlify Drop, Cloudflare Pages…) y comparte el enlace.

## Publicar

El workflow `.github/workflows/deploy_web.yml` corre las pruebas, compila y publica en GitHub Pages en cada push a `main` que toque `web/`. Hay que activar Pages una vez en *Settings → Pages → Source: GitHub Actions*. La app queda en `https://<usuario>.github.io/<repo>/` (en el repo RayGPT: `https://kenjes.github.io/RayGPT/`). El workflow toma el nombre del repo solo, no hay que cambiar nada.

## Servir desde tu computadora (sin GitHub)

```bash
npm run local
```

Compila `raymundo.html` y lo sirve por HTTPS en el puerto 8443 a todos los celulares de tu misma red. En la terminal salen la dirección (`https://<tu-ip>:8443/raymundo.html`) y un código QR para escanear.

- El certificado es autofirmado: la primera vez cada celular avisa "La conexión no es privada". Hay que tocar *Configuración avanzada → Continuar*. Va por HTTPS porque sin él los celulares no dejan usar WebGPU.
- La primera vez Windows pregunta si Node.js puede usar la red: permite *redes privadas*.
- Muchas redes de eventos aíslan a los dispositivos entre sí; si los celulares no llegan a tu compu, comparte internet desde la compu (hotspot) y que se conecten a ella.
- El modelo se sigue descargando de Hugging Face, así que los celulares necesitan internet la primera vez.

## Contador de uso (GoatCounter)

La app puede contar cuántas personas la usan con [GoatCounter](https://www.goatcounter.com): gratis, sin cookies y sin datos personales. Las pláticas nunca se mandan.

1. Crea una cuenta en goatcounter.com y elige un código, por ejemplo `raymundo` (tu panel queda en `https://raymundo.goatcounter.com`).
2. Ponlo en `web/.env`: `VITE_GOATCOUNTER=raymundo` y sube el cambio.
3. Opcional: en *Settings* de GoatCounter activa "Allow adding visitor counts on your website" para que Ajustes muestre "N personas han usado a Raymundo".

Qué vas a ver en el panel:

| Ruta | Significa |
|---|---|
| `/RayGPT/` | Visitas a la página (visitantes únicos) |
| `modelo-ligero`, `modelo-recomendado`, `modelo-potente` | Personas que cargaron ese modelo |
| `platico` | Personas que recibieron al menos una respuesta |
| `sin-webgpu` | Personas cuyo navegador no pudo correrlo |

En `localhost` no se cuenta nada, así que tus pruebas no ensucian los números.

## Cómo está armado

```
web/
├── index.html
├── src/
│   ├── main.ts        # interfaz: plática, arranque, ajustes, dictado
│   ├── motor.ts       # WebLLM en un Web Worker: cargar, generar, detener, borrar
│   ├── worker.ts      # handler del Web Worker
│   ├── modelos.ts     # catálogo de modelos y detección del dispositivo
│   ├── persona.ts     # system prompt, ejemplos y comandos de Raymundo
│   ├── contexto.ts    # arma los mensajes y recorta la plática a la ventana
│   ├── texto.ts       # limpieza de la salida (markdown, <think>, regionalismos)
│   ├── historial.ts   # plática y preferencias en localStorage
│   ├── voz.ts         # TTS y dictado del navegador
│   └── estilos.css
└── public/icons/
```

Los pesos del modelo los guarda WebLLM en la Cache API del navegador; el service worker solo guarda la app. La app pide almacenamiento persistente para que el sistema no borre el modelo.

## Limitaciones honestas

- Un modelo de 1–2B no razona como uno de la nube: para cosas largas o muy técnicas se queda corto.
- En esta versión no hay Gmail, Calendar, Spotify ni búsqueda web; Raymundo lo sabe y ofrece redactar lo que necesites para que lo copies.
- El dictado usa el reconocimiento de voz del navegador, que en Chrome puede necesitar internet (no gasta tokens del LLM).
