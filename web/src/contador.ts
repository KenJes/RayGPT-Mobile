// Contador anónimo de uso con GoatCounter (sin cookies, sin datos personales).
// Solo se manda que alguien abrió la página y eventos sueltos como "modelo-listo";
// el contenido de las pláticas NUNCA sale del dispositivo.
//
// Se activa poniendo el código del sitio en web/.env:  VITE_GOATCOUNTER=micodigo
// (el panel queda en https://micodigo.goatcounter.com). Vacío = sin contador.

const CODIGO = (import.meta.env.VITE_GOATCOUNTER as string | undefined)?.trim() ?? "";

type GoatCounter = { count: (v: { path: string; title?: string; event?: boolean }) => void };
const gc = () => (window as unknown as { goatcounter?: GoatCounter }).goatcounter;

const pendientes: string[] = [];
const yaContados = new Set<string>();

export const contadorActivo = CODIGO !== "";

export function iniciarContador() {
  if (!contadorActivo) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  // La visita a la página la cuenta el script solo al cargar.
  s.dataset.goatcounter = `https://${CODIGO}.goatcounter.com/count`;
  s.onload = () => {
    for (const e of pendientes.splice(0)) gc()?.count({ path: e, title: e, event: true });
  };
  document.head.append(s);
}

// Cuenta un evento una sola vez por sesión (p. ej. "primer-mensaje").
export function registrarEvento(nombre: string) {
  if (!contadorActivo || yaContados.has(nombre)) return;
  yaContados.add(nombre);
  const contador = gc();
  if (contador) contador.count({ path: nombre, title: nombre, event: true });
  else pendientes.push(nombre);
}

// Total de visitantes, para mostrarlo en la app. Requiere activar en GoatCounter
// "Allow adding visitor counts on your website"; si no, regresa null y no se muestra.
export async function totalVisitantes(): Promise<string | null> {
  if (!contadorActivo) return null;
  try {
    const r = await fetch(`https://${CODIGO}.goatcounter.com/counter/TOTAL.json`);
    if (!r.ok) return null;
    const datos = (await r.json()) as { count?: string };
    return datos.count ?? null;
  } catch {
    return null;
  }
}
