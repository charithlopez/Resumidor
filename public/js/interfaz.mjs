import {
    estado,
    textoResumen,
    contadorResumen,
    botonTema,
    mensajeCopiado,
    listaHistorial,
    historialVacio,
    botonBorrarHistorial
} from "./elementos.mjs";
import { NOMBRES_LONGITUD } from "./config.mjs";
import { contarPalabras, formatearFecha } from "./utilidades.mjs";
import { leerHistorial } from "./almacenamiento.mjs";

// --- Avisos con alertas de Bootstrap ---

const CLASES_ESTADO = {
    aviso: "alert alert-warning",
    error: "alert alert-danger",
    ok: "alert alert-success"
};

let temporizadorEstado;

export function mostrarEstado(texto, tipo) {
    estado.textContent = texto;
    estado.className = "estado " + CLASES_ESTADO[tipo];

    clearTimeout(temporizadorEstado);

    temporizadorEstado = setTimeout(function() {
        estado.textContent = "";
        estado.className = "estado";
    }, 4000);
}

// --- Mensaje flotante de "Texto copiado" ---

let temporizadorMensaje;

export function mostrarMensajeCopiado(texto) {
    mensajeCopiado.textContent = texto;
    mensajeCopiado.classList.add("visible");

    clearTimeout(temporizadorMensaje);

    temporizadorMensaje = setTimeout(function() {
        mensajeCopiado.classList.remove("visible");
    }, 2000);
}

// --- Cuadro del resumen y su contador ---

export function mostrarResumen(texto) {
    textoResumen.value = texto;
    contadorResumen.textContent = "Palabras: " + contarPalabras(texto);
}

// --- Tema claro / oscuro ---

export function aplicarTema(tema) {
    const oscuro = tema === "oscuro";
    document.documentElement.dataset.bsTheme = oscuro ? "dark" : "light";
    botonTema.textContent = oscuro ? "Modo claro" : "Modo oscuro";
}

// --- Confirmación en dos clics (sin ventanas emergentes) ---

export function confirmarConDosClics(boton, accion) {
    const textoInicial = boton.textContent;
    let esperando = false;
    let temporizador;

    boton.addEventListener("click", function() {

        if (!esperando) {
            esperando = true;
            boton.textContent = "¿Seguro? Pulsa otra vez";
            mostrarEstado("Pulsa otra vez para confirmar.", "aviso");

            temporizador = setTimeout(function() {
                esperando = false;
                boton.textContent = textoInicial;
            }, 4000);

            return;
        }

        clearTimeout(temporizador);
        esperando = false;
        boton.textContent = textoInicial;
        accion();

    });
}

// --- Dibujar el historial (los botones llevan data-accion y data-id) ---

export function mostrarHistorial() {
    const lista = leerHistorial();

    listaHistorial.textContent = "";
    historialVacio.hidden = lista.length > 0;
    botonBorrarHistorial.disabled = lista.length === 0;

    lista.forEach(function(item) {
        const texto = String(item.resumen || "");
        const vista = texto.length > 150 ? texto.slice(0, 150) + "…" : texto;
        const fecha = formatearFecha(item);
        const palabras = contarPalabras(texto);

        const li = document.createElement("li");
        li.className = "list-group-item px-0 py-3 d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center";

        // Parte izquierda: etiqueta, datos y vista previa
        const info = document.createElement("div");
        info.className = "flex-grow-1 info-historial";

        const datos = document.createElement("div");
        datos.className = "d-flex flex-wrap align-items-center gap-2 mb-1 small text-body-secondary";

        const etiqueta = document.createElement("span");
        etiqueta.className = "badge rounded-pill etiqueta-longitud";
        etiqueta.textContent = NOMBRES_LONGITUD[item.longitud] || "Resumen";

        const detalle = document.createElement("span");
        detalle.textContent = fecha + " · " + palabras + " palabras";

        datos.appendChild(etiqueta);
        datos.appendChild(detalle);

        const parrafo = document.createElement("p");
        parrafo.className = "mb-0 vista-resumen";
        parrafo.textContent = vista;

        info.appendChild(datos);
        info.appendChild(parrafo);

        // Parte derecha: botones (sin listener propio: los atiende main.mjs)
        const botones = document.createElement("div");
        botones.className = "d-flex gap-2 flex-shrink-0";

        const botonVer = document.createElement("button");
        botonVer.className = "btn btn-sm btn-marca";
        botonVer.textContent = "Ver";
        botonVer.dataset.accion = "ver";
        botonVer.dataset.id = item.id;
        botonVer.setAttribute("aria-label", "Ver resumen del " + fecha);

        const botonEliminar = document.createElement("button");
        botonEliminar.className = "btn btn-sm btn-opcion";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.dataset.accion = "eliminar";
        botonEliminar.dataset.id = item.id;
        botonEliminar.setAttribute("aria-label", "Eliminar resumen del " + fecha);

        botones.appendChild(botonVer);
        botones.appendChild(botonEliminar);

        li.appendChild(info);
        li.appendChild(botones);

        listaHistorial.appendChild(li);
    });
}