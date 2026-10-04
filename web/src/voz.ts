// Voz con lo que ya trae el celular: cero descargas y cero tokens.
// Hablar (TTS) usa las voces del sistema; escuchar (STT) usa el reconocimiento del
// navegador, que en Chrome/Android puede necesitar internet.

const VOZ_MASCULINA = /jorge|ra[uú]l|diego|juan|carlos|pablo|andr[eé]s|enrique|male|hombre/i;

let vozElegida: SpeechSynthesisVoice | null = null;

function elegirVoz(): SpeechSynthesisVoice | null {
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
  const porRegion = (r: string) => voces.filter((v) => v.lang.toLowerCase().replace("_", "-") === r);
  for (const grupo of [porRegion("es-mx"), porRegion("es-us"), voces]) {
    const hombre = grupo.find((v) => VOZ_MASCULINA.test(v.name));
    if (hombre) return hombre;
    if (grupo.length) return grupo[0];
  }
  return null;
}

export const puedeHablar = "speechSynthesis" in window;

if (puedeHablar) {
  vozElegida = elegirVoz();
  speechSynthesis.addEventListener?.("voiceschanged", () => (vozElegida = elegirVoz()));
}

export function hablar(texto: string) {
  if (!puedeHablar || !texto.trim()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = vozElegida?.lang ?? "es-MX";
  if (vozElegida) u.voice = vozElegida;
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

export function callar() {
  if (puedeHablar) speechSynthesis.cancel();
}

type Reconocedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const ClaseReconocedor: (new () => Reconocedor) | undefined =
  (window as unknown as Record<string, new () => Reconocedor>).SpeechRecognition ??
  (window as unknown as Record<string, new () => Reconocedor>).webkitSpeechRecognition;

export const puedeEscuchar = !!ClaseReconocedor;

let activo: Reconocedor | null = null;

export function escuchar(alTexto: (texto: string, final: boolean) => void, alTerminar: (error?: string) => void) {
  if (!ClaseReconocedor) return alTerminar("no-soportado");
  activo?.stop();
  const r = new ClaseReconocedor();
  r.lang = "es-MX";
  r.interimResults = true;
  r.continuous = false;
  r.onresult = (e) => {
    let texto = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      texto += e.results[i][0].transcript;
      final = e.results[i].isFinal;
    }
    alTexto(texto, final);
  };
  r.onerror = (e) => alTerminar(e.error);
  r.onend = () => {
    activo = null;
    alTerminar();
  };
  activo = r;
  r.start();
}

export function dejarDeEscuchar() {
  activo?.stop();
}
