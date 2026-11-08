const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const MODELO = process.env.MODELO || "hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M";
const NUM_CTX = 4096;
const KEEP_ALIVE = "30m";
const MAX_CARACTERES = 10000;

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

const MINIMO_PALABRAS = 25;

let ocupado = false;

app.get("/api/salud", function(req, res) {
    res.json({ estado: "ok", modelo: MODELO });
});

app.post("/resumir", async function(req, res) {

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

        const respuesta = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controlador.signal,
            body: JSON.stringify({
                model: MODELO,
                stream: true,
                keep_alive: KEEP_ALIVE,
                options: {
                    temperature: 0.2,
                    num_ctx: NUM_CTX
                },
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
            console.log("Error de Ollama:", await respuesta.text());
            return res.status(500).json({
                error: "Ollama devolvió un error. ¿Descargaste el modelo?"
            });
        }

        res.setHeader("Content-Type", "text/plain; charset=utf-8");

        const decodificador = new TextDecoder();
        let pendiente = "";

        const procesarLinea = function(linea) {
            if (linea.trim() === "") {
                return;
            }
            const parte = JSON.parse(linea);
            if (parte.message && parte.message.content) {
                res.write(parte.message.content);
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

        console.log("Problema con Ollama:", error.message);

        if (!res.headersSent) {
            res.status(503).json({
                error: "No se pudo conectar con Ollama. ¿Está abierto?"
            });
        } else {
            res.end();
        }

    } finally {

        ocupado = false;

    }

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
    console.log("Cargando el modelo en memoria...");

    fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: MODELO,
            keep_alive: KEEP_ALIVE,
            options: { num_ctx: NUM_CTX }
        })
    })
    .then(function(respuesta) {
        console.log(respuesta.ok
            ? "Modelo listo."
            : "No se pudo cargar el modelo. ¿Lo descargaste?");
    })
    .catch(function() {
        console.log("Ollama no está activo. Ábrelo antes de resumir.");
    });

});