import { registerSW } from "virtual:pwa-register";

export function registrarPWA() {
  registerSW({ immediate: true });
}
