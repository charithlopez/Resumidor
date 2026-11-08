export const EN_LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";
export const URL_API = EN_LOCAL ? "" : "https://resumidor-ge5f.onrender.com";

export const CLAVE_TEMA = "tema";
export const CLAVE_HISTORIAL = "historial";
export const MAX_HISTORIAL = 10;

export const NOMBRES_LONGITUD = {
    corto: "Corto",
    mediano: "Mediano",
    largo: "Largo"
};