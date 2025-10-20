// src/services/authExternalService.js
import fetch from "node-fetch";

/**
 * Servicio para comunicar el backend principal con el microservicio Auth (iam-autenVerifi-service-ifn)
 * Permite crear usuarios en el sistema de autenticación gestionado por Supabase.
 *
 * @param {string} correo - Correo electrónico del usuario a crear.
 * @param {string} contraseña - Contraseña del usuario a crear.
 * @returns {Promise<Object>} - Datos del usuario creado o error.
 */
export async function crearUsuarioEnAuth(correo, contraseña) {  // Nota: usamos 'contraseña' para mantener consistencia con el idioma
  try {
    const resp = await fetch("https://iam-auten-verifi-service-ifn.vercel.app/auth/registrar", {  // URL del servicio Auth
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password: contraseña }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("❌ Error creando usuario en Auth:", data);
      throw new Error(data.error || "Error en servicio Auth");
    }

    return data.user;
  } catch (err) {
    console.error("💥 Error en crearUsuarioEnAuth:", err);
    throw err;
  }
}
