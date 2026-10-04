import { describe, expect, it } from "vitest";
import { armarMensajes } from "./contexto";
import { interpretar, SYSTEM_PROMPT } from "./persona";
import { limpiarMarkdown, mexicanizar, procesarRespuesta, quitarPensamiento } from "./texto";

describe("limpiarMarkdown", () => {
  it("quita negritas, encabezados y viñetas", () => {
    expect(limpiarMarkdown("### Hola\n**Claro** que *sí*\n- uno\n* dos")).toBe("Hola\nClaro que sí\nuno\ndos");
  });
  it("respeta listas numeradas, MAYÚSCULAS y multiplicaciones", () => {
    expect(limpiarMarkdown("1. Primero IMPORTANTE\n2. 3 * 4 = 12")).toBe("1. Primero IMPORTANTE\n2. 3 * 4 = 12");
  });
  it("limpia marcadores a medio escribir", () => {
    expect(limpiarMarkdown("Esto es **impor")).toBe("Esto es impor");
  });
});

describe("mexicanizar", () => {
  it("cambia españolismos comunes", () => {
    expect(mexicanizar("Vale, deja el coche y agarra tu móvil y el Ordenador")).toBe(
      "Sale, deja el carro y agarra tu celular y el Computadora",
    );
  });
  it("no toca palabras que sólo contienen la raíz", () => {
    expect(mexicanizar("Eso vale la pena, es un valor automóvil")).toBe("Eso vale la pena, es un valor automóvil");
  });
});

describe("procesarRespuesta", () => {
  it("separa texto y bloques de código", () => {
    const s = procesarRespuesta("Órale, aquí va:\n```python\nprint('hola')\n```\n**Listo**");
    expect(s).toEqual([
      { tipo: "texto", contenido: "Órale, aquí va:" },
      { tipo: "codigo", lenguaje: "python", contenido: "print('hola')" },
      { tipo: "texto", contenido: "Listo" },
    ]);
  });
  it("tolera un bloque de código sin cerrar (streaming)", () => {
    const s = procesarRespuesta("Mira:\n```js\nconst a = 1");
    expect(s[1]).toEqual({ tipo: "codigo", lenguaje: "js", contenido: "const a = 1" });
  });
  it("oculta el razonamiento <think>", () => {
    expect(quitarPensamiento("<think>\n\n</think>\n\nHola")).toBe("Hola");
    expect(quitarPensamiento("Hola <think>pensando")).toBe("Hola ");
  });
});

describe("comandos", () => {
  it("reconoce alias y plantillas", () => {
    expect(interpretar("/limpiar").tipo).toBe("reset");
    expect(interpretar("/AYUDA").tipo).toBe("ayuda");
    expect(interpretar("/email").tipo).toBe("falta-texto");
    const r = interpretar("/traducir good morning");
    expect(r.tipo).toBe("plantilla");
    if (r.tipo === "plantilla") expect(r.prompt).toContain("good morning");
  });
  it("lo que no es comando va como plática", () => {
    expect(interpretar("/ruta/a/archivo no es comando").tipo).toBe("chat");
    expect(interpretar("hola").tipo).toBe("chat");
  });
});

describe("armarMensajes", () => {
  it("pone el system prompt primero y termina con el usuario", () => {
    const m = armarMensajes([{ role: "user", content: "hola" }], 512);
    expect(m[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(m.at(-1)).toEqual({ role: "user", content: "hola" });
  });
  it("recorta la plática vieja cuando no cabe", () => {
    const largo = "x".repeat(3000);
    const h = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 ? "assistant" : "user") as "user" | "assistant",
      content: largo,
    }));
    h.push({ role: "user", content: "última" });
    const m = armarMensajes(h, 512);
    expect(m.length).toBeLessThan(h.length);
    expect(m.at(-1)?.content).toBe("última");
    const primeraPlatica = m.findIndex((x, i) => i > 4 && x.content === largo);
    if (primeraPlatica !== -1) expect(m[primeraPlatica].role).toBe("user");
  });
});
