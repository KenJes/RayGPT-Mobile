// Sirve raymundo.html desde esta computadora a los celulares de la misma red (sin GitHub).
// Uso: npm run local   (compila y luego sirve dist-compartir por HTTPS en el puerto 8443)
//
// Va por HTTPS porque los celulares solo dejan usar WebGPU en páginas seguras. El
// certificado es autofirmado: la primera vez el celular avisa "conexión no privada" y hay
// que tocar "Configuración avanzada" → "Continuar a ...". El modelo se sigue bajando de
// Hugging Face, así que los celulares necesitan internet la primera vez.
import { networkInterfaces } from "node:os";
import basicSsl from "@vitejs/plugin-basic-ssl";
import qrcode from "qrcode-terminal";
import { preview } from "vite";

const PUERTO = Number(process.env.PUERTO ?? 8443);

const server = await preview({
  mode: "un-archivo",
  plugins: [basicSsl({ name: "raymundo-local" })],
  preview: { host: true, port: PUERTO, strictPort: true },
});

// IPv4 de la red local (Wi-Fi, Ethernet o el hotspot de la compu).
const ips = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

console.log("\n  Raymundo está corriendo en esta computadora.\n");
console.log(`  En esta compu:  https://localhost:${PUERTO}/raymundo.html`);
for (const ip of ips) console.log(`  En la red:      https://${ip}:${PUERTO}/raymundo.html`);

if (ips.length) {
  const url = `https://${ips[0]}:${PUERTO}/raymundo.html`;
  console.log(`\n  Escanea para abrir ${url}\n`);
  qrcode.generate(url, { small: true });
}

console.log("  Si el celular no carga: misma red Wi-Fi, permitir Node.js en el Firewall de Windows (redes privadas).");
console.log("  Ctrl+C para detener.\n");

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
