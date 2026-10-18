// Página del buscador en el navegador (specs/002-buscador-coordenadas/contracts/buscador.md).
// Solo conecta el formulario con busqueda.js y web.js; la lógica está allí y tiene pruebas.

import { leerCoordenadas, separarPareja, buscarPrevision, enlaceBusqueda, leerEnlace } from "./busqueda.js";
import { htmlResultado, htmlBuscando, htmlCoordenadasNoValidas } from "./web.js";

const formulario = document.getElementById("buscador");
const campoLatitud = document.getElementById("latitud");
const campoLongitud = document.getElementById("longitud");
const zonaResultado = document.getElementById("resultado");
const botonesPantano = [...formulario.querySelectorAll("button[data-coordenadas]")]; // ninguno si no hay pantanos

// Cada búsqueda tiene un número; si llega la respuesta de una anterior, se descarta.
let ultimaBusqueda = 0;

function repartirPareja(texto) {
  const pareja = separarPareja(texto);
  if (!pareja) return false;
  [campoLatitud.value, campoLongitud.value] = pareja;
  return true;
}

// Se marca el botón del pantano cuyas coordenadas estén escritas, o ninguno.
function marcarPantano() {
  const pareja = `${campoLatitud.value.trim()};${campoLongitud.value.trim()}`;
  for (const boton of botonesPantano) boton.setAttribute("aria-pressed", String(boton.dataset.coordenadas === pareja));
}

// Al pegar «40.757, -3.583» en Latitud se reparte entre los dos campos.
campoLatitud.addEventListener("paste", (evento) => {
  if (repartirPareja(evento.clipboardData?.getData("text") ?? "")) {
    evento.preventDefault();
    marcarPantano();
  }
});

// Pulsar un pantano rellena sus coordenadas; cambiarlas a mano lo desmarca.
for (const boton of botonesPantano) {
  boton.addEventListener("click", () => {
    repartirPareja(boton.dataset.coordenadas);
    marcarPantano();
  });
}
for (const campo of [campoLatitud, campoLongitud]) campo.addEventListener("input", marcarPantano);

async function buscar() {
  if (campoLongitud.value.trim() === "") repartirPareja(campoLatitud.value);
  const coordenadas = leerCoordenadas(campoLatitud.value, campoLongitud.value);
  const numero = ++ultimaBusqueda;
  if (!coordenadas.ok) {
    zonaResultado.innerHTML = htmlCoordenadasNoValidas();
    return;
  }
  const modelo = formulario.elements.modelo.value === "arome" ? "arome" : "estandar";
  const busqueda = { latitud: coordenadas.latitud, longitud: coordenadas.longitud, modelo };
  // La dirección refleja la búsqueda para poder compartirla, sin recargar la página.
  history.replaceState(null, "", location.pathname + enlaceBusqueda(busqueda));
  zonaResultado.innerHTML = htmlBuscando();
  const resultado = await buscarPrevision(busqueda);
  if (numero !== ultimaBusqueda) return;
  zonaResultado.innerHTML = htmlResultado(resultado, busqueda);
}

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  buscar();
});

// Un enlace compartido (?lat=…&lon=…&modelo=arome) rellena el formulario y busca sin pulsar nada.
if (leerEnlace(location.search) !== null) {
  const parametros = new URLSearchParams(location.search);
  campoLatitud.value = parametros.get("lat");
  campoLongitud.value = parametros.get("lon");
  formulario.elements.modelo.value = parametros.get("modelo") === "arome" ? "arome" : "estandar";
  marcarPantano();
  buscar();
}
