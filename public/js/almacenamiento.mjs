import { CLAVE_TEMA, CLAVE_HISTORIAL, MAX_HISTORIAL } from "./config.mjs";

// --- Funciones protegidas: la página funciona aunque el navegador bloquee el almacenamiento ---

export function leerGuardado(clave) {
    try {
        return localStorage.getItem(clave);
    } catch (error) {
        return null;
    }
}

export function guardarValor(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
        return true;
    } catch (error) {
        return false;
    }
}

export function borrarValor(clave) {
    try {
        localStorage.removeItem(clave);
    } catch (error) {
        // Si el navegador lo bloquea, no pasa nada.
    }
}

// --- Historial de resúmenes ---

export function leerHistorial() {
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

export function agregarAlHistorial(resumen, longitud) {
    const lista = leerHistorial();

    lista.unshift({
        id: Date.now(),
        fecha: new Date().toLocaleString("es-CO"),
        longitud: longitud,
        resumen: resumen
    });

    return guardarHistorial(lista.slice(0, MAX_HISTORIAL));
}

export function buscarEnHistorial(id) {
    return leerHistorial().find(function(item) {
        return item.id === id;
    });
}

export function eliminarDelHistorial(id) {
    const resto = leerHistorial().filter(function(item) {
        return item.id !== id;
    });
    return guardarHistorial(resto);
}

export function borrarHistorial() {
    borrarValor(CLAVE_HISTORIAL);
}

export function olvidarDatos() {
    borrarValor(CLAVE_TEMA);
    borrarValor(CLAVE_HISTORIAL);
}