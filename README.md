# Resumidor de Textos

Aplicación web que resume textos usando un modelo de inteligencia artificial que corre en el propio computador, con Ollama. Se puede elegir un resumen corto, mediano o largo.

## Qué incluye

- Modo claro y modo oscuro, que se recuerda entre visitas.
- Historial de los últimos 10 resúmenes, guardado solo en el navegador.
- Diseño adaptable a celular con Bootstrap.
- Servidor con Node.js y Express que entrega la página y conecta con Ollama.

## Requisitos

- Node.js (versión LTS)
- Ollama instalado y abierto
- El modelo descargado:

```
ollama pull hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M
```

## Cómo usarlo

1. Descarga el proyecto y abre una terminal en su carpeta.
2. Instala las dependencias:

```
npm install
```

3. (Opcional) Crea un archivo `.env` para cambiar el puerto, la dirección de Ollama o el modelo:

```
PORT=3000
OLLAMA_URL=http://localhost:11434/api/chat
MODELO=hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M
```

4. Abre Ollama y arranca el servidor:

```
npm start
```

5. Entra a http://localhost:3000 en el navegador.

## Privacidad

El tema y el historial se guardan solo en el navegador de quien usa la página. El historial guarda los resúmenes, no el texto original. El botón "Olvidar mis datos" los borra.

## Nota

Este proyecto necesita Ollama en el mismo computador, por eso no está publicado en internet.
