// 📂 src/services/authExternalService.js
// --------------------------------------------------
// Servicio que maneja comunicación con el backend de autenticación externo
// (iam-auten-verifi-service-ifn)

import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();


const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "https://fast-api-login-six.vercel.app/";

/**
 * Crea un usuario en el servicio Auth externo
 * @param {string} correo - Correo del usuario
 * @param {string} contraseña - Contraseña del usuario
 * @returns {Promise<Object>} Usuario creado o error
 */
export async function crearUsuarioEnAuth(correo, contraseña) {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/registrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ correo, contraseña }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error creando usuario en Auth:", data);
      throw new Error(data.error || "Error creando usuario en Auth");
    }

    console.log("✅ Usuario creado en servicio Auth:", data.user?.email || correo);
    return data.user;
  } catch (err) {
    console.error("🔥 Error conexión Auth:", err.message);
    throw err;
  }
}
