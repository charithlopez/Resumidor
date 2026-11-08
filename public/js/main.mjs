import {
    textoOriginal,
    textoResumen,
    contadorOriginal,
    botonResumir,
    botonCopiar,
    botonTema,
    grupoLongitud,
    listaHistorial,
    tituloHistorial,
    botonBorrarHistorial,
    botonOlvidar
} from "./elementos.mjs";
import { CLAVE_TEMA } from "./config.mjs";
import { contarPalabras } from "./utilidades.mjs";
import {
    leerGuardado,
    guardarValor,
    agregarAlHistorial,
    buscarEnHistorial,
    eliminarDelHistorial,
    borrarHistorial,
    olvidarDatos
} from "./almacenamiento.mjs";
import {
    mostrarEstado,
    mostrarMensajeCopiado,
    mostrarResumen,
    aplicarTema,
    mostrarHistorial,
    confirmarConDosClics
} from "./interfaz.mjs";
import { pedirResumen, despertarServidor } from "./api.mjs";

let longitud = "";

// --- Contador de palabras del texto original ---

textoOriginal.addEventListener("input", function() {
    contadorOriginal.textContent = "Palabras: " + contarPalabras(textoOriginal.value);
});

// --- Delegación de eventos 1: un solo listener para los tres botones de longitud ---

grupoLongitud.addEventListener("click", function(evento) {
    const boton = evento.target.closest(".length-btn");

    if (!boton) {
        return;
    }

    longitud = boton.id;

    grupoLongitud.querySelectorAll(".length-btn").forEach(function(otro) {
        const elegido = otro === boton;
        otro.classList.toggle("seleccionado", elegido);
        otro.setAttribute("aria-pressed", elegido ? "true" : "false");
    });
});

// --- Resumir ---

botonResumir.addEventListener("click", async function() {

    const texto = textoOriginal.value.trim();

    if (texto === "") {
        mostrarEstado("Primero escribe un texto.", "aviso");
        textoOriginal.focus();
        return;
    }

    if (longitud === "") {
        mostrarEstado("Primero selecciona una longitud.", "aviso");
        grupoLongitud.querySelector(".length-btn").focus();
        return;
    }

    botonResumir.disabled = true;
    botonCopiar.disabled = true;
    botonResumir.textContent = "Resumiendo...";
    mostrarResumen("");

    try {

        const resultado = await pedirResumen(texto, longitud, function(trozo) {
            mostrarResumen(textoResumen.value + trozo);
        });

        if (!resultado.ok) {
            mostrarEstado(resultado.mensaje, "error");
            return;
        }

        const resumen = textoResumen.value.trim();
        mostrarResumen(resumen);

        if (resumen !== "") {
            if (!agregarAlHistorial(resumen, longitud)) {
                mostrarEstado("No se pudo guardar el resumen en el historial.", "aviso");
            }
            mostrarHistorial();
        }

    } catch (error) {

        console.error("Error al conectar con el servidor:", error);
        mostrarEstado("No se pudo conectar con el servidor. Si estuvo inactivo, espera un minuto e inténtalo de nuevo.", "error");

    } finally {

        botonResumir.disabled = false;
        botonCopiar.disabled = false;
        botonResumir.textContent = "Resumir";

    }

});

// --- Copiar ---

botonCopiar.addEventListener("click", async function() {

    const resumen = textoResumen.value;

    if (resumen === "") {
        mostrarEstado("Todavía no hay un resumen para copiar.", "aviso");
        return;
    }

    try {
        await navigator.clipboard.writeText(resumen);
        mostrarMensajeCopiado("Texto copiado");
    } catch (error) {
        mostrarMensajeCopiado("No se pudo copiar");
    }

});

// --- Tema claro / oscuro ---

botonTema.addEventListener("click", function() {
    const nuevo = document.documentElement.dataset.bsTheme === "dark" ? "claro" : "oscuro";
    aplicarTema(nuevo);

    if (!guardarValor(CLAVE_TEMA, nuevo)) {
        mostrarEstado("No se pudo guardar el tema en este navegador.", "aviso");
    }
});

// --- Delegación de eventos 2: un solo listener para todos los botones del historial ---

listaHistorial.addEventListener("click", function(evento) {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const id = Number(boton.dataset.id);

    if (boton.dataset.accion === "ver") {
        const item = buscarEnHistorial(id);

        if (item) {
            mostrarResumen(String(item.resumen || ""));
            textoResumen.focus();
        }
    }

    if (boton.dataset.accion === "eliminar") {
        eliminarDelHistorial(id);
        mostrarHistorial();
        tituloHistorial.focus();
    }
});

// --- Borrar historial y olvidar datos (con confirmación) ---

confirmarConDosClics(botonBorrarHistorial, function() {
    borrarHistorial();
    mostrarHistorial();
    mostrarEstado("Historial borrado.", "ok");
    tituloHistorial.focus();
});

confirmarConDosClics(botonOlvidar, function() {
    olvidarDatos();
    aplicarTema("claro");
    mostrarHistorial();
    mostrarEstado("Tus datos se borraron de este navegador.", "ok");
    tituloHistorial.focus();
});

// --- Al cargar la página ---

aplicarTema(leerGuardado(CLAVE_TEMA));
mostrarHistorial();
despertarServidor();