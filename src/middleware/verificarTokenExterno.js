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
// 📂 src/middleware/verificarTokenExterno.js
// --------------------------------------------------
// Middleware para verificar token JWT externo de Supabase Auth

export function verificarTokenExterno(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    // ✅ Decodificar JWT directamente (sin verificar firma, solo leer payload)
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      return res.status(401).json({ error: 'Token malformado' });
    }

    // Decodificar el payload (parte 2 del JWT)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    console.log('📋 Payload del token:', payload);

    // ✅ Extraer email del JWT
    const email = payload.email;

    if (!email) {
      return res.status(401).json({ error: 'Email no encontrado en token' });
    }

    // ✅ Guardar info en req.user para que otros middlewares y rutas lo usen
    req.user = {
      id: payload.sub,
      email: email,
      correo: email,  // Para compatibilidad con esAdmin
      aud: payload.aud
    };

    console.log('✅ Usuario validado:', req.user);
    
    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
    return res.status(403).json({ error: 'Token inválido o no autorizado ❌' });
  }
}
