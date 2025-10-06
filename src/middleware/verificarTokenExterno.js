// 📂 src/middleware/verificarTokenExterno.js

// 📦 Importamos axios para poder hacer peticiones HTTP a otro servicio (AutenVerifi)
import axios from "axios";

/**
 * 🎯 Este middleware se encarga de validar el token usando el servicio AutenVerifi.
 * 
 * Imagina que este middleware es un mensajero 🚴‍♂️ que corre al otro castillo (AutenVerifi)
 * y le pregunta:
 * 
 * "Oye guardia, ¿este token es válido?"
 * 
 * Si el guardia responde “Sí ✅”, dejamos pasar al usuario.
 * Si responde “No ❌”, cerramos la puerta.
 */
export async function verificarTokenExterno(req, res, next) {
  // 🕵️ 1️⃣ Buscamos el token en el header "Authorization"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  // 🚫 2️⃣ Si no hay token → devolvemos error
  if (!token) {
    return res.status(401).json({ error: "Token requerido ❌" });
  }

  try {
    // 🌐 3️⃣ Llamamos al servicio AutenVerifi (tu backend de autenticación)
    const respuesta = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/login`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // ✅ 4️⃣ Si el token es válido → guardamos la info del usuario en req.user
    req.user = respuesta.data.usuario;

    // 🟢 5️⃣ Continuamos a la siguiente parte (la ruta protegida)
    next();
  } catch (error) {
    // ⚠️ 6️⃣ Si algo falla (token inválido, servicio caído, etc.)
    console.error("Error al verificar token externo:", error.message);
    return res.status(403).json({ error: "Token inválido o no autorizado ❌" });
  }
}
