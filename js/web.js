// Genera la página pública (contracts/web.md): un único HTML con el CSS dentro y sin JavaScript.

import { textoActualizacion, horaMinutos, textoDia } from "./fechas.js";

export const TITULO = "GoodWind — previsión de viento";
export const PIE ="Viento y rachas en nudos. La flecha indica hacia dónde sopla el viento. Datos: Open-Meteo.com";

// Escala de color por velocidad, al estilo Windguru: [desde (nudos), color].
// Por debajo de 10 nudos tonos blancos y cian; a partir del umbral, verde y más cálidos.
export const ESCALA = [
  [0, "#ffffff"],
  [5, "#d9fbff"],
  [8, "#9ff0f0"],
  [10, "#9ef59a"],
  [12, "#5fe85a"],
  [14, "#35d43a"],
  [16, "#c4f03a"],
  [18, "#fff23a"],
  [20, "#ffcc33"],
  [22, "#ff9a33"],
  [25, "#ff5a3c"],
  [28, "#ff3f7f"],
  [31, "#ff3fd2"],
  [35, "#c13dff"],
];

// Clase de color ("v0" … "v13") para un valor en nudos.
export function claseColor(nudos) {
  let indice = 0;
  ESCALA.forEach(([desde], i) => {
    if (nudos >= desde) indice = i;
  });
  return `v${indice}`;
}

export const CSS = `
:root {
  --fondo: #f7f9fb; --texto: #14212b; --suave: #5b6b78; --borde: #c9d2da;
  --tarjeta: #ffffff; --enlace: #0b5cad; --boton: #1f9d55; --boton-texto: #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fondo: #0f1820; --texto: #e6edf2; --suave: #9aabb8; --borde: #2c3b47;
    --tarjeta: #16222c; --enlace: #6cb4ff;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 16px; background: var(--fondo); color: var(--texto);
  font: 16px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 960px; margin: 0 auto; }
h1 { font-size: 1.4rem; margin: 0 0 4px; }
h2 { font-size: 1.15rem; margin: 0 0 8px; }
.actualizado { color: var(--suave); margin: 0 0 12px; }
.compartir, .buscar {
  display: inline-block; margin: 0 8px 16px 0; padding: 10px 16px; border-radius: 8px;
  background: var(--boton); color: var(--boton-texto); font-weight: bold; text-decoration: none;
}
nav ul { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-wrap: wrap; gap: 8px; }
nav a {
  display: block; padding: 6px 10px; border: 1px solid var(--borde); border-radius: 999px;
  color: var(--enlace); text-decoration: none; background: var(--tarjeta);
}
section {
  background: var(--tarjeta); border: 1px solid var(--borde); border-radius: 10px;
  padding: 12px; margin: 0 0 16px; scroll-margin-top: 8px;
}
.contenedor-tabla { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; min-width: 560px; text-align: center; }
th, td { border: 1px solid var(--borde); padding: 3px 2px; }
thead th { font-weight: normal; color: var(--suave); font-size: 0.85rem; }
th.fecha span { display: block; }
.inicial { font-weight: bold; }
.dia { color: var(--suave); font-size: 0.85rem; }
th.fecha, thead th:first-child {
  position: sticky; left: 0; background: var(--tarjeta); font-weight: normal; width: 2.4rem;
}
td { min-width: 2.4rem; white-space: nowrap; font-size: 1.05rem; padding: 2px 0 0; color: #111; }
td small { display: block; font-size: 0.75rem; margin-top: 2px; padding: 1px 0; }
td i { display: inline-block; font-style: normal; font-size: 0.9rem; line-height: 1; margin-left: 2px; }
.umbral { font-weight: bold; }
.vacia { color: var(--suave); padding: 3px 2px; }
${ESCALA.map(([desde, color], i) => `.v${i} { background: ${color}; }`).join("\n")}
.sin-datos, .no-disponible { color: var(--suave); }
footer { color: var(--suave); font-size: 0.85rem; margin-top: 8px; }
`;

export function escapar(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function crearIds(previsiones) {
  const usados = new Map();
  return previsiones.map(({ pantano }) => {
    const base =
      pantano.nombre
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "pantano";
    const n = (usados.get(base) ?? 0) + 1;
    usados.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

// Flecha "↑" girada para que apunte hacia donde sopla el viento (la dirección es de dónde viene).
function flecha(direccion) {
  return `<i style="rotate:${(direccion + 180) % 360}deg">↑</i>`;
}

// Marcado mínimo por celda: hay 98 por pantano y la página debe pesar menos de 100 KB.
function celda(h) {
  if (h.viento === null) return `<td class="vacia">–</td>`;
  const clase = `${claseColor(h.viento)}${h.llegaAlUmbral ? " umbral" : ""}`;
  const conFlecha = h.viento !== 0 && h.direccion !== null;
  const rachas = h.rachas === null ? `<small>–</small>` : `<small class="${claseColor(h.rachas)}">${h.rachas}</small>`;
  return `<td class="${clase}">${h.viento}${conFlecha ? flecha(h.direccion) : ""}${rachas}</td>`;
}

// Horas en columnas (8h … 21h) y días en filas.
export function tabla(dias) {
  const cabecera = dias[0].horas.map((h) => `<th scope="col">${h.hora}h</th>`).join("");
  const filas = dias
    .map(
      (d) =>
        `<tr><th class="fecha" scope="row"><span class="inicial">${d.inicial}</span><span class="dia">${d.diaMes}</span></th>` +
        d.horas.map(celda).join("") +
        `</tr>`,
    )
    .join("\n");
  return (
    `<div class="contenedor-tabla"><table>` +
    `<thead><tr><th scope="col"></th>${cabecera}</tr></thead>\n` +
    `<tbody>\n${filas}\n</tbody></table></div>`
  );
}

function seccion(prevision, id) {
  const nombre = escapar(prevision.pantano.nombre);
  const contenido =
    prevision.estado === "ok"
      ? tabla(prevision.dias)
      : `<p class="sin-datos">Sin datos de previsión (intento: ${horaMinutos(prevision.obtenidaEn)})</p>`;
  return `<section id="${id}">\n<h2>${nombre}</h2>\n${contenido}\n</section>`;
}

function botonCompartir(aviso) {
  if (!aviso?.hayAviso) return "";
  return `<a class="compartir" href="https://wa.me/?text=${encodeURIComponent(aviso.texto)}">Compartir en WhatsApp</a>\n`;
}

const BOTON_BUSCAR = `<a class="buscar" href="buscar.html">Buscar ubicación</a>\n`;

export function generarHtml(previsiones,{ actualizadoEn = new Date(), aviso = null } = {}) {
  const hayDatos = previsiones.some((p) => p.estado === "ok");
  let cuerpo;
  if (hayDatos) {
    const ids = crearIds(previsiones);
    const indice = previsiones
      .map((p, i) => `<li><a href="#${ids[i]}">${escapar(p.pantano.nombre)}</a></li>`)
      .join("");
    cuerpo =
      botonCompartir(aviso) +
      BOTON_BUSCAR +
      `<nav aria-label="Pantanos"><ul>${indice}</ul></nav>\n` +
      previsiones.map((p, i) => seccion(p, ids[i])).join("\n");
  } else {
    cuerpo = BOTON_BUSCAR + `<p class="no-disponible">Previsión no disponible en este momento</p>`;
  }

  return pagina({
    titulo: TITULO,
    cuerpo: `<p class="actualizado">Actualizado el ${textoActualizacion(actualizadoEn)}</p>\n${cuerpo}`,
  });
}

// Esqueleto común de las páginas: mismo CSS, título y pie.
export function pagina({ titulo, cuerpo, cabeza = "" }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>${CSS}</style>
${cabeza}</head>
<body>
<main>
<h1>${titulo}</h1>
${cuerpo}
<footer>${PIE}</footer>
</main>
</body>
</html>
`;
}

// --- Buscador (specs/002-buscador-coordenadas/contracts/buscador.md) ---
// generarHtmlBuscador se usa al generar la web; el resto, en el navegador desde js/buscador.js.

const CSS_BUSCADOR = `
.volver { color: var(--enlace); text-decoration: none; }
form { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: flex-end; margin: 0 0 16px; }
form label { display: flex; flex-direction: column; flex: 1 1 140px; color: var(--suave); font-size: 0.9rem; }
form input {
  font: inherit; padding: 8px; border: 1px solid var(--borde); border-radius: 8px;
  background: var(--tarjeta); color: var(--texto);
}
form button {
  font: inherit; font-weight: bold; padding: 9px 20px; border: 0; border-radius: 8px; cursor: pointer;
  background: var(--boton); color: var(--boton-texto);
}
.modelo { flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0; padding: 0; border: 0; }
.modelo legend { padding: 0; margin-bottom: 4px; color: var(--suave); font-size: 0.9rem; }
.modelo label { flex-direction: row; align-items: center; gap: 6px; flex: 0 0 auto; color: var(--texto); font-size: 1rem; }
.buscando, .nota { color: var(--suave); }
.nota { margin: 0 0 8px; }
`;

export function generarHtmlBuscador() {
  return pagina({
    titulo: TITULO,
    cabeza: `<style>${CSS_BUSCADOR}</style>\n<script type="module" src="js/buscador.js"></script>\n`,
    cuerpo:
      `<p><a class="volver" href="index.html">← Pantanos</a></p>\n` +
      `<form id="buscador" novalidate>\n` +
      `<label for="latitud">Latitud <input id="latitud" name="latitud" placeholder="40.757" autocomplete="off"></label>\n` +
      `<label for="longitud">Longitud <input id="longitud" name="longitud" placeholder="-3.583" autocomplete="off"></label>\n` +
      `<fieldset class="modelo"><legend>Modelo</legend>\n` +
      `<label><input type="radio" name="modelo" value="estandar" checked> Sin AROME</label>\n` +
      `<label><input type="radio" name="modelo" value="arome"> Con AROME HD</label>\n` +
      `</fieldset>\n` +
      `<button type="submit">Buscar</button>\n` +
      `</form>\n` +
      `<div id="resultado" aria-live="polite"></div>`,
  });
}

const NOMBRE_MODELO = { estandar: "Modelo estándar", arome: "AROME HD" };

export function htmlResultado(resultado, { latitud, longitud, modelo }) {
  if (resultado.estado === "fuera-de-cobertura") {
    return `<p class="sin-datos">AROME HD no cubre esta ubicación. Prueba sin AROME.</p>`;
  }
  if (resultado.estado !== "ok") {
    return `<p class="sin-datos">No se ha podido obtener la previsión. Inténtalo de nuevo en unos minutos.</p>`;
  }
  const titulo = `${latitud}, ${longitud} · ${NOMBRE_MODELO[modelo] ?? NOMBRE_MODELO.estandar}`;
  const nota = resultado.hasta
    ? `<p class="nota">Previsión AROME HD hasta el ${textoDia(resultado.hasta.fecha)} a las ${resultado.hasta.hora}h</p>\n`
    : "";
  return `<section>\n<h2>${escapar(titulo)}</h2>\n${nota}${tabla(resultado.dias)}\n</section>`;
}

export function htmlCoordenadasNoValidas() {
  return `<p class="sin-datos">Coordenadas no válidas: la latitud va de -90 a 90 y la longitud de -180 a 180.</p>`;
}

export function htmlBuscando() {
  return `<p class="buscando">Buscando…</p>`;
}
