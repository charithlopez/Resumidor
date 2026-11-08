export function contarPalabras(texto) {
    const limpio = texto.trim();
    return limpio === "" ? 0 : limpio.split(/\s+/).length;
}

export function formatearFecha(item) {
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