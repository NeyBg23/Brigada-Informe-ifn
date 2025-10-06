// 📂 src/routes/brigadas.js
// ----------------------------------------------------------
// Aquí vive la parte del servidor que maneja las brigadas 👷‍♀️
// Este archivo define las rutas para ver la información
// de los usuarios o miembros de brigadas desde Supabase.
// Solo pueden entrar los que tengan un token válido.

// 🧩 Importamos las herramientas necesarias
import express from "express"; // Framework para crear el servidor
import supabase from "../db/supabase.js"; // Conexión con la base de datos Supabase
import { verificarTokenExterno } from "../middleware/verificarTokenExterno.js"; // Guardián del token

// 🚪 Creamos un router (una mini app con sus propias rutas)
const router = express.Router();

/**
 * 📍 GET /api/brigadas
 * ----------------------------------------------------------
 * Esta ruta sirve para obtener la lista de brigadistas o usuarios.
 * 
 * 🔐 Está protegida por el middleware verificarTokenExterno,
 * que primero revisa si el token es válido.
 * 
 * Si el token está bien ✅ → te deja pasar y devuelve los datos.
 * Si el token está mal ❌ → te dice “no puedes entrar”.
 */
router.get("/", verificarTokenExterno, async (req, res) => {
  try {
    // 👤 Tomamos la información del usuario autenticado
    // (esta info viene del token y la puso el middleware)
    const usuario = req.user;

    console.log("🪪 Usuario autenticado:", usuario.email);

    // 🧱 Pedimos los datos de la tabla "usuarios" en Supabase
    // Puedes cambiar "usuarios" por "brigadas" si ya creaste esa tabla
    const { data, error } = await supabase
      .from("usuarios") // 👈 Aquí está la tabla en Supabase
      .select("id, nombre_completo, correo, rol, descripcion, created_at");

    // ⚠️ Si Supabase devuelve error, lo lanzamos
    if (error) throw error;

    // ✅ Si todo va bien, devolvemos los datos
    res.json({
      mensaje: "✅ Acceso permitido. Token verificado correctamente.",
      usuario: usuario, // quién hizo la solicitud
      data, // datos de los usuarios o brigadas
    });
  } catch (err) {
    // 🚨 Si algo falla, devolvemos un error
    console.error("❌ Error al obtener brigadas:", err.message);
    res.status(500).json({ error: "Error en el servidor 😔" });
  }
});

/**
 * 📍 POST /api/brigadas
 * ----------------------------------------------------------
 * Esta ruta sirve para crear una nueva brigada.
 * También está protegida por el token.
 */
router.post("/", verificarTokenExterno, async (req, res) => {
  try {
    // 📥 Recibimos los datos que el usuario envía
    const { nombre, descripcion, jefe_brigada } = req.body;

    // 🧾 Validamos que haya nombre (obligatorio)
    if (!nombre) {
      return res.status(400).json({ error: "El nombre de la brigada es requerido ❌" });
    }

    // 🧱 Insertamos en la tabla "brigadas"
    const { data, error } = await supabase
      .from("brigadas")
      .insert([{ nombre, descripcion, jefe_brigada }])
      .select();

    // ⚠️ Si Supabase falla
    if (error) throw error;

    // ✅ Todo salió bien
    res.json({
      mensaje: "✅ Brigada creada correctamente",
      brigada: data[0],
    });
  } catch (err) {
    console.error("❌ Error al crear brigada:", err.message);
    res.status(500).json({ error: "Error en el servidor 😔" });
  }
});

// 🚀 Exportamos el router para usarlo en index.js
export default router;
