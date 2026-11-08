const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;
const IA_URL = process.env.IA_URL || "https://api.groq.com/openai/v1/chat/completions";
const IA_MODELO = process.env.IA_MODELO || "llama-3.3-70b-versatile";
const IA_CLAVE = process.env.IA_CLAVE;

const ORIGENES = (process.env.ORIGENES_PERMITIDOS || "http://localhost:3000")
    .split(",")
    .map(function(origen) {
        return origen.trim();
    });

const MAX_CARACTERES = 10000;
const MINIMO_PALABRAS = 25;

const FORMATOS = {
    corto: "en 1 o 2 frases",
    mediano: "en un solo párrafo",
    largo: "en 2 o 3 párrafos"
};

const PALABRAS = {
    corto: 40,
    mediano: 80,
    largo: 175
};

app.use(cors({ origin: ORIGENES }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

let ocupado = false;

app.get("/api/salud", function(req, res) {
    res.json({ estado: "ok", modelo: IA_MODELO });
});

app.use("/api", function(req, res) {
    res.status(404).json({ error: "Ruta no encontrada." });
});

app.post("/resumir", async function(req, res) {

    if (!IA_CLAVE) {
        console.log("Falta IA_CLAVE: agrégala en el archivo .env");
        return res.status(500).json({ error: "El servidor no está configurado todavía." });
    }

    const { texto, longitud } = req.body || {};

    if (typeof texto !== "string" || texto.trim() === "") {
        return res.status(400).json({ error: "Texto inválido." });
    }

    if (!FORMATOS[longitud]) {
        return res.status(400).json({ error: "Longitud inválida." });
    }

    if (texto.length > MAX_CARACTERES) {
        return res.status(413).json({
            error: "El texto es demasiado largo (máximo " + MAX_CARACTERES + " caracteres)."
        });
    }

    const palabrasTexto = texto.trim().split(/\s+/).length;

    if (palabrasTexto < MINIMO_PALABRAS) {
        return res.status(400).json({
            error: "El texto es muy corto para resumirlo. Escribe al menos " + MINIMO_PALABRAS + " palabras."
        });
    }

    const maximo = Math.min(PALABRAS[longitud], Math.floor(palabrasTexto * 0.6));

    if (ocupado) {
        return res.status(429).json({ error: "Ya hay un resumen en proceso." });
    }

    ocupado = true;

    console.log("Resumen pedido: " + longitud + ", " + palabrasTexto + " palabras (máximo " + maximo + ").");

    const controlador = new AbortController();

    res.on("close", function() {
        if (!res.writableEnded) {
            controlador.abort();
        }
    });

    try {

        const respuesta = await fetch(IA_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + IA_CLAVE
            },
            signal: controlador.signal,
            body: JSON.stringify({
                model: IA_MODELO,
                stream: true,
                temperature: 0.2,
                messages: [
                    {
                        role: "system",
                        content: "Eres un asistente que resume textos. Usa únicamente la información del texto, no inventes datos y responde en el mismo idioma del texto. Devuelve solo el resumen, sin introducciones ni comentarios."
                    },
                    {
                        role: "user",
                        content: `Resume el siguiente texto ${FORMATOS[longitud]}, de máximo ${maximo} palabras. El resumen debe ser más corto que el texto original.\n\n${texto}`
                    }
                ]
            })
        });

        if (!respuesta.ok) {
            console.log("Error del servicio de IA (" + respuesta.status + "):", await respuesta.text());

            if (respuesta.status === 429) {
                return res.status(429).json({
                    error: "El servicio de IA está ocupado. Espera un minuto e inténtalo de nuevo."
                });
            }

            return res.status(502).json({
                error: "El servicio de IA devolvió un error. Revisa la clave y el modelo."
            });
        }

        res.setHeader("Content-Type", "text/plain; charset=utf-8");

        const decodificador = new TextDecoder();
        let pendiente = "";

        const procesarLinea = function(linea) {
            const limpia = linea.trim();

            if (!limpia.startsWith("data:")) {
                return;
            }

            const dato = limpia.slice(5).trim();

            if (dato === "" || dato === "[DONE]") {
                return;
            }

            const parte = JSON.parse(dato);
            const contenido = parte.choices
                && parte.choices[0]
                && parte.choices[0].delta
                && parte.choices[0].delta.content;

            if (contenido) {
                res.write(contenido);
            }
        };

        for await (const trozo of respuesta.body) {
            pendiente += decodificador.decode(trozo, { stream: true });
            const lineas = pendiente.split("\n");
            pendiente = lineas.pop();
            lineas.forEach(procesarLinea);
        }

        procesarLinea(pendiente);
        res.end();

        console.log("Resumen terminado.");

    } catch (error) {

        console.log("Problema con el servicio de IA:", error.message);

        if (!res.headersSent) {
            res.status(503).json({
                error: "No se pudo conectar con el servicio de IA."
            });
        } else {
            res.end();
        }

    } finally {

        ocupado = false;

    }

});

app.use(function(error, req, res, next) {

    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({ error: "El texto es demasiado largo." });
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "La petición no es válida." });
    }

    console.log("Error inesperado:", error.message);
    res.status(500).json({ error: "Error interno del servidor." });

});

app.listen(PORT, function(error) {

    if (error) {
        if (error.code === "EADDRINUSE") {
            console.log("El puerto " + PORT + " está ocupado. Cierra el otro servidor o cambia PORT en el archivo .env.");
        } else {
            console.log("No se pudo iniciar el servidor:", error.message);
        }
        process.exit(1);
    }

    console.log("Servidor funcionando en http://localhost:" + PORT);
    console.log("Modelo de IA: " + IA_MODELO);
    console.log(IA_CLAVE
        ? "Clave de IA encontrada."
        : "ATENCIÓN: falta IA_CLAVE en el archivo .env.");

});