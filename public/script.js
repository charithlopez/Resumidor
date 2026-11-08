const EN_LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const URL_API = EN_LOCAL ? "" : "https://resumidor-ge5f.onrender.com";

let longitud = "";

const textoOriginal = document.querySelector("#textoOriginal");
const contadorOriginal = document.querySelector("#contadorOriginal");
const contadorResumen = document.querySelector("#contadorResumen");
const textoResumen = document.querySelector("#textoResumen");
const botonResumir = document.querySelector("#btnResumir");
const botonCopiar = document.querySelector("#btnCopiar");
const botonesLongitud = document.querySelectorAll(".length-btn");
const estado = document.querySelector("#estado");

let temporizadorEstado;

const CLASES_ESTADO = {
    aviso: "alert alert-warning",
    error: "alert alert-danger",
    ok: "alert alert-success"
};

function mostrarEstado(texto, tipo) {
    estado.textContent = texto;
    estado.className = "estado " + CLASES_ESTADO[tipo];

    clearTimeout(temporizadorEstado);

    temporizadorEstado = setTimeout(function() {
        estado.textContent = "";
        estado.className = "estado";
    }, 4000);
}

function contarPalabras(texto) {
    const limpio = texto.trim();
    return limpio === "" ? 0 : limpio.split(/\s+/).length;
}

textoOriginal.addEventListener("input", function() {
    contadorOriginal.textContent = "Palabras: " + contarPalabras(textoOriginal.value);
});

botonesLongitud.forEach(function(boton) {
    boton.addEventListener("click", function() {
        longitud = boton.id;
        botonesLongitud.forEach(function(b) {
            b.classList.remove("seleccionado");
            b.setAttribute("aria-pressed", "false");
        });
        boton.classList.add("seleccionado");
        boton.setAttribute("aria-pressed", "true");
    });
});

botonResumir.addEventListener("click", async function() {

    const texto = textoOriginal.value.trim();

    if (texto === "") {
        mostrarEstado("Primero escribe un texto.", "aviso");
        textoOriginal.focus();
        return;
    }

    if (longitud === "") {
        mostrarEstado("Primero selecciona una longitud.", "aviso");
        botonesLongitud[0].focus();
        return;
    }

    botonResumir.disabled = true;
    botonCopiar.disabled = true;
    botonResumir.textContent = "Resumiendo...";
    textoResumen.value = "";
    contadorResumen.textContent = "Palabras: 0";

    try {

        const respuesta = await fetch(URL_API + "/resumir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texto: texto, longitud: longitud })
        });

        if (!respuesta.ok) {
            const data = await respuesta.json();
            mostrarEstado(data.error || "Ocurrió un error.", "error");
            return;
        }

        const lector = respuesta.body.getReader();
        const decodificador = new TextDecoder();

        while (true) {
            const { done, value } = await lector.read();

            if (done) {
                break;
            }

            textoResumen.value += decodificador.decode(value, { stream: true });
            contadorResumen.textContent = "Palabras: " + contarPalabras(textoResumen.value);
        }

        textoResumen.value = textoResumen.value.trim();
                if (textoResumen.value !== "") {
            agregarAlHistorial(textoResumen.value, longitud);
        }

    } catch (error) {

        mostrarEstado("No se pudo conectar con el servidor. ¿Está corriendo (npm start)?", "error");
        contadorResumen.textContent = "Palabras: 0";

    } finally {

        botonResumir.disabled = false;
        botonCopiar.disabled = false;
        botonResumir.textContent = "Resumir";

    }

});

const mensajeCopiado = document.querySelector("#mensajeCopiado");
let temporizadorMensaje;

botonCopiar.addEventListener("click", async function() {

    const resumen = textoResumen.value;

    if (resumen === "") {
        mostrarEstado("Todavía no hay un resumen para copiar.", "aviso");
        return;
    }

    try {
        await navigator.clipboard.writeText(resumen);
        mensajeCopiado.textContent = "Texto copiado";
    } catch (error) {
        mensajeCopiado.textContent = "No se pudo copiar";
    }

    mensajeCopiado.classList.add("visible");

    clearTimeout(temporizadorMensaje);

    temporizadorMensaje = setTimeout(function() {
        mensajeCopiado.classList.remove("visible");
    }, 2000);

});

// ================= PERSISTENCIA =================

const CLAVE_TEMA = "tema";
const CLAVE_HISTORIAL = "historial";
const MAX_HISTORIAL = 10;

const NOMBRES_LONGITUD = {
    corto: "Corto",
    mediano: "Mediano",
    largo: "Largo"
};

const botonTema = document.querySelector("#btnTema");
const listaHistorial = document.querySelector("#listaHistorial");
const historialVacio = document.querySelector("#historialVacio");
const tituloHistorial = document.querySelector("#tituloHistorial");
const botonBorrarHistorial = document.querySelector("#btnBorrarHistorial");
const botonOlvidar = document.querySelector("#btnOlvidar");

// --- Funciones protegidas: la página funciona aunque el navegador bloquee el almacenamiento ---

function leerGuardado(clave) {
    try {
        return localStorage.getItem(clave);
    } catch (error) {
        return null;
    }
}

function guardarValor(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
        return true;
    } catch (error) {
        return false;
    }
}

function borrarValor(clave) {
    try {
        localStorage.removeItem(clave);
    } catch (error) {
        // Si el navegador lo bloquea, no pasa nada.
    }
}

// --- Confirmación en dos clics (sin ventanas emergentes) ---

function confirmarConDosClics(boton, accion) {
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

// --- Tema claro / oscuro ---

function aplicarTema(tema) {
    const oscuro = tema === "oscuro";
    document.documentElement.dataset.bsTheme = oscuro ? "dark" : "light";
    botonTema.textContent = oscuro ? "Modo claro" : "Modo oscuro";
}

botonTema.addEventListener("click", function() {
    const nuevo = document.documentElement.dataset.bsTheme === "dark" ? "claro" : "oscuro";
    aplicarTema(nuevo);

    if (!guardarValor(CLAVE_TEMA, nuevo)) {
        mostrarEstado("No se pudo guardar el tema en este navegador.", "aviso");
    }
});

// --- Historial de resúmenes ---

function leerHistorial() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL));
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        return [];
    }
}

function guardarHistorial(lista) {
    try {
        localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista));
        return true;
    } catch (error) {
        return false;
    }
}

function agregarAlHistorial(resumen, longitudElegida) {
    const lista = leerHistorial();

    lista.unshift({
        id: Date.now(),
        fecha: new Date().toLocaleString("es-CO"),
        longitud: longitudElegida,
        resumen: resumen
    });

    if (!guardarHistorial(lista.slice(0, MAX_HISTORIAL))) {
        mostrarEstado("No se pudo guardar el resumen en el historial.", "aviso");
    }

    mostrarHistorial();
}

function formatearFecha(item) {
    const fecha = new Date(item.id);

    if (isNaN(fecha.getTime())) {
        return String(item.fecha || "");
    }

    return fecha.toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
    });
}

function mostrarHistorial() {
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

        // Parte derecha: botones
        const botones = document.createElement("div");
        botones.className = "d-flex gap-2 flex-shrink-0";

        const botonVer = document.createElement("button");
        botonVer.className = "btn btn-sm btn-marca";
        botonVer.textContent = "Ver";
        botonVer.setAttribute("aria-label", "Ver resumen del " + fecha);
        botonVer.addEventListener("click", function() {
            textoResumen.value = texto;
            contadorResumen.textContent = "Palabras: " + contarPalabras(texto);
            textoResumen.focus();
        });

        const botonEliminar = document.createElement("button");
        botonEliminar.className = "btn btn-sm btn-opcion";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.setAttribute("aria-label", "Eliminar resumen del " + fecha);
        botonEliminar.addEventListener("click", function() {
            const resto = leerHistorial().filter(function(otro) {
                return otro.id !== item.id;
            });
            guardarHistorial(resto);
            mostrarHistorial();
            tituloHistorial.focus();
        });

        botones.appendChild(botonVer);
        botones.appendChild(botonEliminar);

        li.appendChild(info);
        li.appendChild(botones);

        listaHistorial.appendChild(li);
    });
}

confirmarConDosClics(botonBorrarHistorial, function() {
    borrarValor(CLAVE_HISTORIAL);
    mostrarHistorial();
    mostrarEstado("Historial borrado.", "ok");
    tituloHistorial.focus();
});

confirmarConDosClics(botonOlvidar, function() {
    borrarValor(CLAVE_TEMA);
    borrarValor(CLAVE_HISTORIAL);
    aplicarTema("claro");
    mostrarHistorial();
    mostrarEstado("Tus datos se borraron de este navegador.", "ok");
    tituloHistorial.focus();
});

// --- Al cargar la página: aplicar lo que quedó guardado ---

aplicarTema(leerGuardado(CLAVE_TEMA));
mostrarHistorial();

// Despierta el servidor gratuito apenas se abre la página
fetch(URL_API + "/api/salud").catch(function() {});