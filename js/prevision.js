// Previsión de viento de Open-Meteo (research.md §1, data-model.md).

import { diasSiguientes, inicialDia, diaMes, hoyEnMadrid } from "./fechas.js";

export const UMBRAL_NUDOS = 10;

const HORAS = Array.from({ length: 14 }, (_, i) => 8 + i); // 8h … 21h
const URL_OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const MODELO_AROME = "meteofrance_arome_france_hd";

// Sin modelo, Open-Meteo elige el suyo (el de los pantanos). Con AROME no mezcla otros modelos.
export function construirUrl(pantano, { modelo } = {}) {
  const url = new URL(URL_OPEN_METEO);
  url.searchParams.set("latitude", String(pantano.latitud));
  url.searchParams.set("longitude", String(pantano.longitud));
  url.searchParams.set("hourly", "wind_speed_10m,wind_gusts_10m,wind_direction_10m");
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("forecast_days", "8");
  if (modelo === "arome") url.searchParams.set("models", MODELO_AROME);
  return url.toString();
}

function numeroONulo(valor) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function redondear(valor) {
  return valor === null ? null : Math.round(valor);
}

export function construirDias(respuesta, hoy, { dias = diasSiguientes(hoy) } = {}) {
  const horario = respuesta?.hourly;
  if (!horario || !Array.isArray(horario.time)) {
    throw new Error("la respuesta no contiene datos horarios");
  }
  const indice = new Map(horario.time.map((t, i) => [t, i]));

  return dias.map((fecha) => ({
    fecha,
    inicial: inicialDia(fecha),
    diaMes: diaMes(fecha),
    horas: HORAS.map((hora) => {
      const i = indice.get(`${fecha}T${String(hora).padStart(2, "0")}:00`);
      const viento = redondear(numeroONulo(horario.wind_speed_10m?.[i]));
      const rachas = redondear(numeroONulo(horario.wind_gusts_10m?.[i]));
      const direccion = redondear(numeroONulo(horario.wind_direction_10m?.[i]));
      return {
        hora,
        viento,
        rachas,
        direccion: direccion === null ? null : direccion % 360,
        llegaAlUmbral: viento !== null && viento >= UMBRAL_NUDOS,
      };
    }),
  }));
}

export async function obtenerPrevision(
  pantano,
  { ahora = new Date(), hoy = hoyEnMadrid(ahora), fetch = globalThis.fetch } = {},
) {
  try {
    const respuesta = await fetch(construirUrl(pantano), { signal: AbortSignal.timeout(30000) });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const dias = construirDias(await respuesta.json(), hoy);
    return { pantano, obtenidaEn: ahora, estado: "ok", dias };
  } catch (error) {
    console.warn(`Aviso: sin datos de previsión para ${pantano.nombre}: ${error.message}`);
    return { pantano, obtenidaEn: ahora, estado: "sin-datos", dias: [] };
  }
}
