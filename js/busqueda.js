// Búsqueda de previsión por coordenadas (specs/002-buscador-coordenadas).
// Se ejecuta en el navegador y en las pruebas: no puede importar nada de node:*.

import { hoyEnMadrid, diasDesdeHoy } from "./fechas.js";
import { construirUrl, construirDias } from "./prevision.js";

const NUMERO = /^[+-]?\d+([.,]\d+)?$/;

function leerNumero(texto) {
  const limpio = String(texto ?? "").trim();
  return NUMERO.test(limpio) ? Number(limpio.replace(",", ".")) : null;
}

// Grados decimales con punto o coma: -90 ≤ latitud ≤ 90 y -180 ≤ longitud ≤ 180.
export function leerCoordenadas(textoLatitud, textoLongitud) {
  const latitud = leerNumero(textoLatitud);
  const longitud = leerNumero(textoLongitud);
  if (latitud === null || longitud === null) return { ok: false };
  if (Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return { ok: false };
  return { ok: true, latitud, longitud };
}

// "40.757, -3.583" (Google Maps), "40,757; -3,583", "40.757 -3.583" o "40.757,-3.583" → [lat, lon].
// La coma sin espacio solo separa si ningún número usa coma decimal; si no, "40,757" sería una pareja.
export function separarPareja(texto) {
  const limpio = String(texto ?? "").trim();
  let partes;
  if (limpio.includes(";")) partes = limpio.split(/\s*;\s*/);
  else if (/,\s/.test(limpio)) partes = limpio.split(/\s*,\s+/);
  else if (/\s/.test(limpio)) partes = limpio.split(/\s+/);
  else partes = limpio.split(",");
  if (partes.length !== 2 || !partes.every((p) => NUMERO.test(p))) return null;
  if (!/[;\s]/.test(limpio) && !partes.every((p) => p.includes("."))) return null;
  return partes;
}

// La búsqueda en la dirección, para compartirla: ?lat=40.757&lon=-3.583&modelo=arome (research.md §7).
export function enlaceBusqueda({ latitud, longitud, modelo }) {
  const parametros = new URLSearchParams({ lat: String(latitud), lon: String(longitud) });
  if (modelo === "arome") parametros.set("modelo", "arome");
  return `?${parametros}`;
}

// null si el enlace no trae búsqueda; { ok: false } si trae coordenadas no válidas.
export function leerEnlace(search) {
  const parametros = new URLSearchParams(search);
  if (!parametros.has("lat") || !parametros.has("lon")) return null;
  const coordenadas = leerCoordenadas(parametros.get("lat"), parametros.get("lon"));
  if (!coordenadas.ok) return coordenadas;
  return { ...coordenadas, modelo: parametros.get("modelo") === "arome" ? "arome" : "estandar" };
}

// Open-Meteo responde 400 con este motivo si el modelo pedido no cubre la ubicación (research.md §3).
const SIN_DATOS_UBICACION = "No data is available for this location";

async function fueraDeCobertura(respuesta) {
  if (respuesta.status !== 400) return false;
  try {
    return (await respuesta.json())?.reason === SIN_DATOS_UBICACION;
  } catch {
    return false;
  }
}

// Con AROME solo quedan los días con algún dato; nunca se completan con otro modelo.
function recortarArome(dias) {
  const conDatos = dias.filter((d) => d.horas.some((h) => h.viento !== null));
  if (conDatos.length === 0) return { estado: "fuera-de-cobertura" };
  const ultimo = conDatos.at(-1);
  const hora = ultimo.horas.findLast((h) => h.viento !== null).hora;
  return { estado: "ok", dias: conDatos, hasta: { fecha: ultimo.fecha, hora } };
}

// Resultado (data-model.md): { estado: "ok", dias, hasta? } | { estado: "fuera-de-cobertura" } | { estado: "sin-datos" }.
export async function buscarPrevision(
  { latitud, longitud, modelo },
  { ahora = new Date(), fetch = globalThis.fetch } = {},
) {
  const hoy = hoyEnMadrid(ahora);
  try {
    const respuesta = await fetch(construirUrl({ latitud, longitud }, { modelo }), {
      signal: AbortSignal.timeout(30000),
    });
    if (!respuesta.ok) {
      return { estado: (await fueraDeCobertura(respuesta)) ? "fuera-de-cobertura" : "sin-datos" };
    }
    const dias = construirDias(await respuesta.json(), hoy, { dias: diasDesdeHoy(hoy) });
    return modelo === "arome" ? recortarArome(dias) : { estado: "ok", dias };
  } catch {
    return { estado: "sin-datos" };
  }
}
