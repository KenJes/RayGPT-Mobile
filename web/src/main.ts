import "./estilos.css";
import { contadorActivo, iniciarContador, registrarEvento, totalVisitantes } from "./contador";
import { registrarPWA } from "./pwa";
import { cargarHistorial, guardarHistorial, paraModelo, preferencias, serializar, type Entrada } from "./historial";
import { buscarNivel, detectarDispositivo, nivelesPara, nivelSugerido, varianteDe, type Dispositivo, type Nivel } from "./modelos";
import {
  interpretar,
  RESPUESTA_A_RAI,
  RESPUESTA_A_RAYMUNDO,
  RESPUESTA_AYUDA,
  RESPUESTA_RESET,
  respuestaFaltaTexto,
  respuestaFija,
  SALUDO,
  type Personalidad,
} from "./persona";
import { procesarRespuesta, textoPlano, type Segmento } from "./texto";
import { callar, dejarDeEscuchar, escuchar, hablar, puedeEscuchar, puedeHablar } from "./voz";

registrarPWA();
iniciarContador();

// WebLLM pesa ~6 MB: lo cargamos aparte para que la plática se pinte al instante.
let modMotor: typeof import("./motor") | null = null;
const motor = async () => (modMotor ??= await import("./motor"));
const modeloActual = () => modMotor?.modeloActual() ?? null;
const estaDescargado = async (modelo: string) => (await motor()).estaDescargado(modelo);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const chat = $<HTMLElement>("chat");
const estado = $<HTMLElement>("estado");
const arranque = $<HTMLElement>("arranque");
const form = $<HTMLFormElement>("composer");
const entrada = $<HTMLTextAreaElement>("entrada");
const btnEnviar = $<HTMLButtonElement>("btn-enviar");
const btnMic = $<HTMLButtonElement>("btn-mic");
const dlgAjustes = $<HTMLDialogElement>("ajustes");

let historial: Entrada[] = cargarHistorial();
let dispositivo: Dispositivo;
let generando = false;
let listo = false;
let leerEnVoz = preferencias.leer("voz") === "1";
let personalidad: Personalidad = preferencias.leer("personalidad") === "rai" ? "rai" : "raymundo";

function cambiarPersonalidad(p: Personalidad) {
  personalidad = p;
  preferencias.escribir("personalidad", p);
  $<HTMLElement>("nombre").textContent = p === "rai" ? "rAI" : "Raymundo";
}

// ---------- Pintar mensajes ----------

function crear<K extends keyof HTMLElementTagNameMap>(tag: K, clase?: string, texto?: string) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function copiar(texto: string, boton: HTMLButtonElement) {
  navigator.clipboard?.writeText(texto).then(() => {
    const antes = boton.textContent;
    boton.textContent = "¡Copiado!";
    setTimeout(() => (boton.textContent = antes), 1200);
  });
}

function pintarSegmentos(cont: HTMLElement, segmentos: Segmento[]) {
  cont.replaceChildren(
    ...segmentos.map((s) => {
      if (s.tipo === "texto") return crear("p", undefined, s.contenido);
      const bloque = crear("div", "bloque");
      bloque.append(crear("div", "lenguaje", s.lenguaje || "código"));
      const pre = crear("pre");
      pre.append(crear("code", undefined, s.contenido));
      const btn = crear("button", "copiar", "Copiar");
      btn.type = "button";
      btn.onclick = () => copiar(s.contenido, btn);
      bloque.append(pre, btn);
      return bloque;
    }),
  );
}

function pintarMensaje(e: Entrada): HTMLElement {
  const div = crear("div", `msg ${e.role}`);
  if (e.role === "user") {
    div.textContent = e.mostrar ?? e.content;
    return div;
  }
  const cuerpo = crear("div", "cuerpo");
  const segmentos = procesarRespuesta(e.content);
  pintarSegmentos(cuerpo, segmentos);
  div.append(cuerpo, accionesDe(segmentos, e.stats));
  return div;
}

function accionesDe(segmentos: Segmento[], stats?: string) {
  const acciones = crear("div", "acciones");
  const btnCopiar = crear("button", undefined, "Copiar");
  btnCopiar.type = "button";
  btnCopiar.onclick = () => copiar(textoPlano(segmentos), btnCopiar);
  acciones.append(btnCopiar);
  if (puedeHablar) {
    const btnVoz = crear("button", undefined, "Escuchar");
    btnVoz.type = "button";
    btnVoz.onclick = () => hablar(textoPlano(segmentos, false));
    acciones.append(btnVoz);
  }
  if (stats) acciones.append(crear("span", "stats", stats));
  return acciones;
}

function cercaDelFinal() {
  return chat.scrollHeight - chat.scrollTop - chat.clientHeight < 120;
}

function bajar(forzar = false) {
  if (forzar || cercaDelFinal()) chat.scrollTop = chat.scrollHeight;
}

function pintarTodo() {
  chat.replaceChildren();
  if (historial.length === 0) chat.append(pintarMensaje({ role: "assistant", content: SALUDO, local: true }));
  for (const e of historial) chat.append(pintarMensaje(e));
  bajar(true);
}

function agregar(e: Entrada) {
  historial.push(e);
  guardarHistorial(historial);
  chat.append(pintarMensaje(e));
  bajar(true);
}

// ---------- Conversación ----------

function ponerGenerando(v: boolean) {
  generando = v;
  form.classList.toggle("generando", v);
  btnEnviar.setAttribute("aria-label", v ? "Detener" : "Enviar");
  actualizarBotones();
}

function actualizarBotones() {
  btnEnviar.disabled = !listo || (!generando && !entrada.value.trim());
  entrada.disabled = !listo;
}

async function enviar(texto: string) {
  const intento = interpretar(texto);
  callar();

  if (intento.tipo === "reset") {
    historial = [];
    guardarHistorial(historial);
    cambiarPersonalidad("raymundo");
    chat.replaceChildren();
    agregar({ role: "assistant", content: RESPUESTA_RESET, local: true });
    return;
  }
  if (intento.tipo === "personalidad") {
    cambiarPersonalidad(intento.cual);
    if (intento.cual === "rai") registrarEvento("modo-rai");
    // "/rai <mensaje>": cambia de modo y contesta ese mensaje ya como rAI.
    if (!intento.texto) {
      agregar({ role: "user", content: texto, local: true });
      agregar({ role: "assistant", content: intento.cual === "rai" ? RESPUESTA_A_RAI : RESPUESTA_A_RAYMUNDO, local: true });
      return;
    }
    return enviar(intento.texto);
  }
  const fija = intento.tipo === "chat" ? respuestaFija(intento.texto, personalidad) : null;
  if (fija) {
    // Va al historial normal (no local) para que el modelo vea su propia respuesta después.
    agregar({ role: "user", content: texto });
    agregar({ role: "assistant", content: fija });
    if (leerEnVoz) hablar(fija);
    return;
  }
  if (intento.tipo === "ayuda" || intento.tipo === "falta-texto") {
    agregar({ role: "user", content: texto, local: true });
    const r = intento.tipo === "ayuda" ? RESPUESTA_AYUDA : respuestaFaltaTexto(intento.comando);
    agregar({ role: "assistant", content: r, local: true });
    return;
  }

  const usuario: Entrada =
    intento.tipo === "plantilla"
      ? { role: "user", content: intento.prompt, mostrar: intento.texto }
      : { role: "user", content: intento.texto };
  agregar(usuario);
  const maxTokens = intento.tipo === "plantilla" ? (intento.comando.maxTokens ?? 512) : 512;

  const burbuja = crear("div", "msg assistant pensando");
  const cuerpo = crear("div", "cuerpo");
  burbuja.append(cuerpo);
  chat.append(burbuja);
  bajar(true);
  ponerGenerando(true);

  let pendiente = "";
  let cuadro = 0;
  const m = await motor();
  const intentar = () =>
    m.generar(
      paraModelo(historial),
      (acumulado) => {
        pendiente = acumulado;
        // Pintamos máximo una vez por frame para no gastar batería de más.
        cuadro ||= requestAnimationFrame(() => {
          cuadro = 0;
          pintarSegmentos(cuerpo, procesarRespuesta(pendiente));
          bajar();
        });
      },
      maxTokens,
      personalidad,
    );

  try {
    let r: Awaited<ReturnType<typeof intentar>>;
    try {
      r = await intentar();
    } catch (err) {
      // El celular le quitó la GPU al navegador: recargamos el modelo (ya está guardado,
      // no se vuelve a descargar) y reintentamos una vez sin que el usuario haga nada.
      if (!m.esPerdidaDeGPU(err)) throw err;
      cancelAnimationFrame(cuadro);
      cuadro = 0;
      cuerpo.textContent = "Se me durmió la GPU del celular, déjame despertarla…";
      await m.reiniciar();
      if (!(await cargarNivel(buscarNivel(preferencias.leer("nivel"))))) throw err;
      cuerpo.textContent = "";
      r = await intentar();
    }
    cancelAnimationFrame(cuadro);

    let segmentos = procesarRespuesta(r.texto);
    if (segmentos.length === 0) {
      segmentos = [{ tipo: "texto", contenido: "Híjole, no me salió nada. ¿Me lo dices de otra forma?" }];
    }
    const velocidad = r.tokens ? `${(r.tokens / r.segundos).toFixed(1)} tok/s` : `${r.segundos.toFixed(1)} s`;
    const final: Entrada = {
      role: "assistant",
      content: serializar(segmentos),
      stats: r.interrumpido ? `detenido · ${velocidad}` : velocidad,
    };
    historial.push(final);
    registrarEvento("platico");
    guardarHistorial(historial);
    burbuja.replaceWith(pintarMensaje(final));
    bajar();
    if (leerEnVoz) hablar(textoPlano(segmentos, false));
  } catch (err) {
    cancelAnimationFrame(cuadro);
    // Que el mensaje fallido no se le reenvíe al modelo en el siguiente turno.
    usuario.local = true;
    guardarHistorial(historial);
    burbuja.remove();
    const detalle = err instanceof Error ? err.message : String(err);
    const motivo = modMotor?.ultimoMotivoPerdida();
    agregar({
      role: "assistant",
      content: modMotor?.esPerdidaDeGPU(err)
        ? "Híjole, tu celular le cortó la GPU al navegador y no la pude recuperar. Suele pasar por falta de memoria. " +
          "Prueba cerrando otras apps y pestañas, recargando la página, o usando Chrome si estás en otro navegador." +
          `\n\nDetalle técnico: ${motivo ?? detalle}` +
          `\nEquipo: ${describirDispositivo(dispositivo)} · ${varianteDe(buscarNivel(preferencias.leer("nivel")), dispositivo).modelo}`
        : `Híjole, algo falló al generar la respuesta: ${detalle}\n\nSi se repite, prueba con un modelo más ligero en Ajustes.`,
      local: true,
    });
  } finally {
    ponerGenerando(false);
  }
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (generando) return modMotor?.detener();
  const texto = entrada.value.trim();
  if (!texto || !listo) return;
  entrada.value = "";
  ajustarAltura();
  actualizarBotones();
  void enviar(texto);
});

const tecladoFisico = matchMedia("(pointer: fine)").matches;
entrada.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && !ev.shiftKey && tecladoFisico && !ev.isComposing) {
    ev.preventDefault();
    form.requestSubmit();
  }
});

function ajustarAltura() {
  entrada.style.height = "auto";
  entrada.style.height = Math.min(entrada.scrollHeight, 140) + "px";
}
entrada.addEventListener("input", () => {
  ajustarAltura();
  actualizarBotones();
});

// ---------- Dictado ----------

if (puedeEscuchar) {
  btnMic.hidden = false;
  let escuchando = false;
  btnMic.onclick = () => {
    if (escuchando) return dejarDeEscuchar();
    escuchando = true;
    btnMic.classList.add("escuchando");
    const previo = entrada.value ? entrada.value.trimEnd() + " " : "";
    escuchar(
      (texto) => {
        entrada.value = previo + texto;
        ajustarAltura();
        actualizarBotones();
      },
      (error) => {
        escuchando = false;
        btnMic.classList.remove("escuchando");
        if (error && error !== "no-speech" && error !== "aborted") {
          estado.textContent = error === "network" ? "El dictado necesita internet" : `Dictado: ${error}`;
          setTimeout(ponerEstadoListo, 3000);
        }
      },
    );
  };
}

// ---------- Arranque y modelos ----------

function mb(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)} GB` : `${Math.round(n)} MB`;
}

function ponerEstadoListo() {
  const nivel = buscarNivel(preferencias.leer("nivel"));
  estado.textContent = listo ? `${nivel.nombre} · corriendo en tu dispositivo` : "Sin modelo";
  estado.classList.toggle("listo", listo);
}

function describirDispositivo(d: Dispositivo) {
  const partes = [d.gpu ? `GPU ${d.gpu}` : "GPU compatible", d.f16 ? "shader-f16 ✓" : "sin shader-f16 (usaré variantes f32)"];
  if (d.ramGB) partes.push(`~${d.ramGB} GB de RAM`);
  return partes.join(" · ");
}

async function mostrarArranque() {
  const sugerido = nivelSugerido(dispositivo);
  const guardado = preferencias.leer("nivel");
  const elegido = guardado ?? sugerido;
  const cont = $<HTMLFieldSetElement>("niveles");
  cont.replaceChildren();

  for (const nivel of nivelesPara(dispositivo)) {
    const v = varianteDe(nivel, dispositivo);
    const label = crear("label", "nivel");
    const radio = crear("input");
    radio.type = "radio";
    radio.name = "nivel";
    radio.value = nivel.id;
    radio.checked = nivel.id === elegido;
    const nombre = crear("span", "nombre", nivel.nombre);
    if (nivel.id === sugerido) nombre.append(crear("span", "etiqueta", "Para tu equipo"));
    const descargado = await estaDescargado(v.modelo);
    const detalle = crear(
      "span",
      "detalle",
      `${v.nombre}. ${nivel.descripcion} ${descargado ? "Ya descargado." : `Descarga: ~${mb(v.descargaMB)}.`}`,
    );
    label.append(radio, nombre, detalle);
    cont.append(label);
  }

  $("dispositivo").textContent = describirDispositivo(dispositivo);
  arranque.hidden = false;
}

async function cargarNivel(nivel: Nivel): Promise<boolean> {
  const v = varianteDe(nivel, dispositivo);
  const btn = $<HTMLButtonElement>("btn-descargar");
  const caja = $<HTMLElement>("progreso");
  const barra = $<HTMLElement>("progreso-barra");
  const txt = $<HTMLElement>("progreso-texto");
  const errorEl = $<HTMLElement>("error-arranque");

  arranque.hidden = false;
  btn.disabled = true;
  caja.hidden = false;
  errorEl.hidden = true;
  listo = false;
  actualizarBotones();
  estado.classList.remove("listo");
  estado.textContent = `Cargando ${nivel.nombre}…`;

  try {
    await (await motor()).cargar(v.modelo, (r) => {
      barra.style.width = `${Math.round(r.progress * 100)}%`;
      txt.textContent = traducirProgreso(r.text, r.progress);
    });
    preferencias.escribir("nivel", nivel.id);
    registrarEvento(`modelo-${nivel.id}`);
    listo = true;
    arranque.hidden = true;
    ponerEstadoListo();
    actualizarBotones();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errorEl.hidden = false;
    errorEl.textContent = /memory|OOM|allocate|device (was )?lost/i.test(msg)
      ? `Tu dispositivo se quedó sin memoria con el modelo ${nivel.nombre}. Prueba con uno más ligero.\n\n${msg}`
      : `No se pudo cargar el modelo. Revisa tu conexión e inténtalo de nuevo.\n\n${msg}`;
    estado.textContent = "Sin modelo";
    return false;
  } finally {
    btn.disabled = false;
  }
}

function traducirProgreso(texto: string, p: number) {
  const pct = `${Math.round(p * 100)}%`;
  if (/Fetching param cache|Loading model from cache/i.test(texto)) {
    const m = texto.match(/(\d+)MB (?:fetched|loaded)/i);
    return `${/cache/i.test(texto) && /Loading/i.test(texto) ? "Leyendo del dispositivo" : "Descargando"} ${pct}${m ? ` · ${m[1]} MB` : ""}`;
  }
  if (/shader|compil/i.test(texto)) return `Preparando la GPU… ${pct}`;
  if (p >= 1) return "¡Listo!";
  return `Despertando a Raymundo… ${pct}`;
}

$<HTMLButtonElement>("btn-descargar").onclick = () => {
  const id = (document.querySelector<HTMLInputElement>('input[name="nivel"]:checked')?.value ?? "ligero") as Nivel["id"];
  void cargarNivel(buscarNivel(id));
};

// ---------- Ajustes ----------

$<HTMLButtonElement>("btn-ajustes").onclick = async () => {
  const voz = $<HTMLInputElement>("opt-voz");
  voz.checked = leerEnVoz;
  voz.disabled = !puedeHablar;
  await pintarModelosEnAjustes();
  dlgAjustes.showModal();
  const visitantes = $<HTMLElement>("visitantes");
  const total = await totalVisitantes();
  visitantes.hidden = total === null;
  if (total) visitantes.textContent = `${total} personas han usado a Raymundo.`;
};

$<HTMLElement>("privacidad").textContent = contadorActivo
  ? "Tus pláticas nunca salen de tu dispositivo. Solo contamos visitas de forma anónima, sin cookies."
  : "Todo se queda en tu dispositivo.";

$<HTMLInputElement>("opt-voz").onchange = (ev) => {
  leerEnVoz = (ev.target as HTMLInputElement).checked;
  preferencias.escribir("voz", leerEnVoz ? "1" : "0");
  if (!leerEnVoz) callar();
};

$<HTMLButtonElement>("btn-borrar-platica").onclick = () => {
  dlgAjustes.close();
  void enviar("/reset");
};

async function pintarModelosEnAjustes() {
  const info = $<HTMLElement>("info-modelo");
  info.textContent = dispositivo?.webgpu
    ? `${describirDispositivo(dispositivo)}${modeloActual() ? ` · Cargado: ${modeloActual()}` : ""}`
    : "Este navegador no tiene WebGPU.";

  const lista = $<HTMLElement>("lista-modelos");
  lista.replaceChildren();
  if (!dispositivo?.webgpu) return;

  for (const nivel of nivelesPara(dispositivo)) {
    const v = varianteDe(nivel, dispositivo);
    const descargado = await estaDescargado(v.modelo);
    const activo = modeloActual() === v.modelo;
    const item = crear("div", "modelo-item");
    const titulo = crear("strong", undefined, nivel.nombre);
    if (activo) titulo.append(crear("span", "etiqueta", "En uso"));
    item.append(
      titulo,
      crear("div", "nota", `${v.nombre}. ${nivel.descripcion} ${descargado ? "Descargado." : `~${mb(v.descargaMB)} por descargar.`}`),
    );
    const botones = crear("div", "botones");
    if (!activo) {
      const usar = crear("button", "usar", descargado ? "Usar" : "Descargar y usar");
      usar.type = "button";
      usar.onclick = () => {
        dlgAjustes.close();
        void cargarNivel(nivel).then((ok) => {
          if (!ok) void mostrarArranque();
        });
      };
      botones.append(usar);
    }
    if (descargado) {
      const borrar = crear("button", undefined, "Borrar descarga");
      borrar.type = "button";
      borrar.onclick = async () => {
        if (!confirm(`¿Borrar ${nivel.nombre} del dispositivo? Lo tendrías que descargar otra vez.`)) return;
        await (await motor()).borrarDescarga(v.modelo);
        if (activo) {
          listo = false;
          ponerEstadoListo();
          actualizarBotones();
          dlgAjustes.close();
          void mostrarArranque();
          return;
        }
        await pintarModelosEnAjustes();
      };
      botones.append(borrar);
    }
    item.append(botones);
    lista.append(item);
  }
}

// ---------- Inicio ----------

async function iniciar() {
  cambiarPersonalidad(personalidad);
  pintarTodo();
  actualizarBotones();
  dispositivo = await detectarDispositivo();
  void motor().then((m) => m.limpiarRetirados());

  if (!dispositivo.webgpu) {
    estado.textContent = "Sin WebGPU";
    registrarEvento("sin-webgpu");
    await mostrarArranque().catch(() => {});
    $("niveles").hidden = true;
    $("btn-descargar").hidden = true;
    const err = $<HTMLElement>("error-arranque");
    err.hidden = false;
    err.textContent =
      `${dispositivo.motivo ?? "Este navegador no puede correr modelos locales."}\n\n` +
      "Para usar a Raymundo en tu celular necesitas:\n" +
      "Android: Chrome 121 o más nuevo (Android 12+).\n" +
      "iPhone/iPad: Safari con iOS 26 o más nuevo.\n" +
      "Computadora: Chrome, Edge o Safari recientes.";
    return;
  }

  const guardado = preferencias.leer("nivel");
  if (guardado) {
    const nivel = buscarNivel(guardado);
    if (await estaDescargado(varianteDe(nivel, dispositivo).modelo)) {
      // Ya está en el dispositivo: lo despertamos directo, sin preguntar.
      await mostrarArranque();
      if (await cargarNivel(nivel)) return;
    }
  }
  await mostrarArranque();
  estado.textContent = "Elige un modelo para empezar";
}

void iniciar();
