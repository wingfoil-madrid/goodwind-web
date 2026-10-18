// Fechas y horas en hora peninsular española. El cambio de hora lo resuelve Intl,
// nunca se calcula a mano.

const ZONA = "Europe/Madrid";

// Índice = getUTCDay() (0 = domingo).
const INICIALES = ["D", "L", "M", "X", "J", "V", "S"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const formato = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partesEnMadrid(ahora) {
  return Object.fromEntries(formato.formatToParts(ahora).map((p) => [p.type, p.value]));
}

// "AAAA-MM-DD" → Date a las 00:00 UTC, solo para aritmética de calendario.
function aFechaUtc(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export function hoyEnMadrid(ahora = new Date()) {
  const p = partesEnMadrid(ahora);
  return `${p.year}-${p.month}-${p.day}`;
}

export function horaMinutos(ahora = new Date()) {
  const p = partesEnMadrid(ahora);
  return `${p.hour}:${p.minute}`;
}

export function fechaHoraRegistro(ahora = new Date()) {
  const p = partesEnMadrid(ahora);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export function sumarDias(fecha, n) {
  const d = aFechaUtc(fecha);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasSiguientes(hoy) {
  return Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i + 1));
}

// Los 7 días del buscador, que consulta en el momento: de hoy a hoy+6.
export function diasDesdeHoy(hoy) {
  return Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
}

export function inicialDia(fecha) {
  return INICIALES[aFechaUtc(fecha).getUTCDay()];
}

export function diaMes(fecha) {
  return Number(fecha.slice(8, 10));
}

// "viernes 16"
export function textoDia(fecha) {
  return `${DIAS[aFechaUtc(fecha).getUTCDay()]} ${diaMes(fecha)}`;
}

export function fechaCorta(fecha) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

// "jueves 1 de octubre de 2026 a las 20:00"
export function textoActualizacion(ahora = new Date()) {
  const fecha = hoyEnMadrid(ahora);
  const d = aFechaUtc(fecha);
  return `${DIAS[d.getUTCDay()]} ${diaMes(fecha)} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()} a las ${horaMinutos(ahora)}`;
}
