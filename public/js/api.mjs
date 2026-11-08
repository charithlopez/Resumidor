import { URL_API } from "./config.mjs";

export async function pedirResumen(texto, longitud, alRecibirTrozo) {
    const respuesta = await fetch(URL_API + "/resumir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto, longitud: longitud })
    });

    if (!respuesta.ok) {
        const datos = await respuesta.json().catch(function() {
            return {};
        });
        return { ok: false, mensaje: datos.error || "Ocurrió un error." };
    }

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();

    while (true) {
        const { done, value } = await lector.read();

        if (done) {
            break;
        }

        alRecibirTrozo(decodificador.decode(value, { stream: true }));
    }

    return { ok: true };
}

// Despierta el servidor gratuito apenas se abre la página
export function despertarServidor() {
    fetch(URL_API + "/api/salud").catch(function() {});
}