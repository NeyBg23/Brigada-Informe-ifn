// 📂 src/routes/brigadas.js
// ----------------------------------------------------------
// Aquí vive la parte del servidor que maneja las brigadas 👷‍♀️
// Este archivo define las rutas para ver la información
// de los usuarios o miembros de brigadas desde Supabase.
// Solo pueden entrar los que tengan un token válido.

// 🧩 Importamos las herramientas necesarias
import express from "express"; // Framework para crear el servidor
import { supabase } from "../db/supabase.js"; // Conexión con la base de datos Supabase
import { verificarTokenExterno } from "../middleware/verificarTokenExterno.js"; // Guardián del token
import dotenv from "dotenv";

dotenv.config();
// 🚪 Creamos un router (una mini app con sus propias rutas)
const router = express.Router();

// 🧸 Función helper: Chequea si es admin (como un guardia que solo deja pasar al jefe).

async function esAdmin(req, res, next) {
  try {
    const usuario = req.user;
    const email = usuario?.correo || usuario?.email; // <-- Acepta ambos campos

    if (!email) {
      console.warn("⚠️ El token no tiene correo o email:", usuario);
      return res.status(403).json({ error: "Token inválido o sin correo ❌" });
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("correo", email)
      .maybeSingle();

    if (error) {
      console.error("❌ Error consultando Supabase:", error.message);
      return res.status(500).json({ error: "Error al validar rol ❌" });
    }

    if (!data) {
      console.warn("⚠️ Usuario no encontrado en la base:", email);
      return res.status(403).json({ error: "Usuario no registrado ❌" });
    }

    if (data.rol !== "admin") {
      console.warn(`🚫 Acceso denegado: ${email} tiene rol '${data.rol}'`);
      return res.status(403).json({ error: "Solo admins pueden hacer esto ❌" });
    }

    next(); // ✅ Todo bien, continúa

  } catch (err) {
    console.error("💥 Error en esAdmin:", err.message);
    res.status(500).json({ error: "Error interno en validación de rol 😔" });
  }
}

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
router.get("/usuarios", verificarTokenExterno, async (req, res) => {
  try {
    // 👤 Tomamos la información del usuario autenticado
    // (esta info viene del token y la puso el middleware)
    const usuario = req.user;

    console.log("👤 Usuario autenticado:", usuario.email);

    // 🚀 Obtenemos todas las brigadas desde Supabase
    const { data, error } = await supabase.from("usuarios").select("*");
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
 * 📍 POST /api/usuarios
 * ----------------------------------------------------------
 * Esta ruta sirve para crear una nueva brigada.
 * También está protegida por el token.
 */
// 📍 POST /api/usuarios - Crear nuevo empleado
router.post("/usuarios", verificarTokenExterno, esAdmin, async (req, res) => {
  try {
    // 📥 Recibimos los datos que el usuario envía
    const { nombre_completo, correo, cargo, region, telefono, fecha_ingreso, descripcion, rol = 'brigadista' } = req.body;
    // 🧸 Subir foto y PDF a Supabase Storage (asumimos que frontend envía como base64 o URL, pero para simple: simula).
    // Para real: Usa supabase.storage.from('bucket').upload() - crea un bucket en Supabase.
    // 🧾 Validamos que haya nombre (obligatorio)
    const foto_url = 'url_de_foto';  // Reemplaza con upload real.
    const hoja_vida_url = 'url_de_pdf';  // Reemplaza.


    // 🧱 Insertamos en la tabla "brigadas"
    const { data, error } = await supabase.from("usuarios").insert([{
       nombre_completo, correo, cargo, region, telefono, fecha_ingreso, descripcion, rol, foto_url, hoja_vida_url
    }]).select();  /// Selecciona para devolver el nuevo registro

    // ⚠️ Si Supabase falla
    if (error) throw error;

    // ✅ Todo salió bien
    res.json({
      mensaje: "✅ Empleado creada correctamente",
      usuario: data[0],
    });
  } catch (err) {
    console.error("❌ Error al crear empleado:", err.message);
    res.status(500).json({ error: "Error en el servidor 😔" });
  }
});


// 📍 GET /api/brigadas - Lista brigadas.
router.get("/brigadas", verificarTokenExterno, async (req, res) => {
  try {
    const { data, error } = await supabase.from("brigadas").select("*");  // Corrige: antes era usuarios!
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener brigadas 😔" });
  }
});
// 📍 GET /api/brigadas/:idbrigada - Detalle de una brigada.
router.get("/brigadas/:idbrigada", verificarTokenExterno, async (req, res) => {
  try {
    const { idbrigada } = req.params;
    const { data, error } = await supabase.from("brigadas").select("*").eq("id", idbrigada).maybeSingle();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener brigadas 😔" });
  }
});

// Ver Empleados
router.get("/empleados", verificarTokenExterno, async (req, res) => {
  try {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener empleados 😔" });
  }
});
// Dar acceso a datos sensibles
router.get("/hoja-vida/:nombreArchivo", async (req, res) => {
  const debug = {};
  try {
    const { nombreArchivo } = req.params;
    const decodedFileName = decodeURIComponent(nombreArchivo);

    debug.one = `🗂 Solicitando archivo: ${decodedFileName}`;

    // ✅ Construimos correctamente la ruta dentro del bucket
    const filePath = `empleados/${decodedFileName}`;
    debug.dos = `📁 filePath: ${filePath}`;

    const { data, error } = await supabase.storage
      .from("hojas_de_vida")
      .createSignedUrl(filePath, 600);

    if (error || !data || !data.signedUrl) {
      debug.tres = `❌ Error creando signed URL: ${error}, ${data}`;
      return res.json(debug);
    }

    res.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error("🔥 Error en /hoja-vida:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/perfil", verificarTokenExterno, async (req, res) => {
  const debug = {};
  debug.user = "a1dfb2fc-6d75-4d63-8983-755063f19ea8"; // Lo puse estatico por unos problemas, pero ya lo estoy solucionando

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", debug.user)
    .single();
    
  debug.data = data;

  if (error) {
    debug.error = error;
    console.error("Error al obtener perfil:", debug);
    return res.status(500).json({ message: debug });
  }

  return res.status(200).json({ data });
});


router.put("/perfil", verificarTokenExterno, async (req, res) => {
  const userId = "a1dfb2fc-6d75-4d63-8983-755063f19ea8"; // Lo puse estatico por unos problemas, pero ya lo estoy solucionando
  const { descripcion, region, telefono } = req.body;

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .update({ descripcion, region, telefono })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar perfil:", error);
      return res.status(400).json({ message: "Error actualizando el perfil" });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error("Error inesperado:", err);
    return res.status(500).json({ message: "Error actualizando el perfil" });
  }
});


// Crear Empleados
router.post("/empleados", verificarTokenExterno, async (req, res) => {
  try {
    const {
      nombre_completo,
      access_token,
      correo,
      cedula,
      telefono,
      region,
      descripcion,
      direccion,
      contraseña,
      hoja_vida_url, // ✅ ya viene directo del frontend (Subido a Storage)
    } = req.body;

    // 👷‍♂️ Insertar en la base de datos
    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre_completo,
          correo,
          direccion,
          cedula,
          telefono,
          region,
          descripcion,
          hoja_vida_url,
        },
      ])
      .select();

    if (error) {
      console.error("❌ Error insertando en la base:", error);
      throw error;
    }

    // Aquí llamo al backend de login para registrar en el Auth al usuario.
    const resAuth = await fetch(`${process.env.AUTH_SERVICE_URL}/api/registrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({ uid: data, correo, contraseña }),
    });

    const dataAuth = await resAuth.json();

    if (resAuth.ok) {
      res.json({
        mensaje: "Empleado creado ✅",
        empleado: data[0],
      });

    } else return res.status(401).json({ error: "Error al crear empleado en el Auth 😔", data });
    
  } catch (err) {
    console.error("🔥 Error en /empleados:", err);
    res.status(500).json({ error: "Error al crear empleado 😔"+err });
  }
});


router.get("/empleados/:idempleado", verificarTokenExterno, async (req, res) => {
  try {
    const { idempleado } = req.params;
    const { data, error } = await supabase.from("usuarios").select("*").eq("id", idempleado).maybeSingle();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener empleado 😔" });
  } 
});


// 📍 POST /api/brigadas - Crear brigada con empleados y jefe.
router.post("/brigadas", verificarTokenExterno, esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, jefe_brigada, brigadistas } = req.body;  // brigadistas: array de uuids
    // 🧸 Paso 1: Crea la brigada.
    const { data: brigada, error: errBrig } = await supabase.from("brigadas").insert([{ nombre, descripcion, jefe_brigada }]).select();
    if (errBrig) throw errBrig;

    // 🧸 Paso 2: Asigna brigadistas (incluye al jefe si no está).
    const asignaciones = brigadistas.map(usuario_id => ({ brigada_id: brigada[0].id, usuario_id }));
    const { error: errAsig } = await supabase.from("brigada_brigadistas").insert(asignaciones);
    if (errAsig) throw errAsig;

    res.json({ mensaje: "Brigada creada ✅", brigada: brigada[0] });
  } catch (err) {
    res.status(500).json({ error: "Error al crear brigada 😔" });
  }
});

router.get("/conglomerados", verificarTokenExterno, async (req, res) => {
  try {
    const { data, error } = await supabase.from("conglomerados").select("*");
    if (error) throw error;

    res.json({ data });

  } catch (err) {
    res.status(500).json({ error: "Error al obtener conglomerados 😔" });
  }
});
router.get("/conglomerados/:idconglomerado", verificarTokenExterno, async (req, res) => {
  try {
    const { idconglomerado } = req.params;
    const { data, error } = await supabase.from("conglomerados").select("*").eq("id", idconglomerado).maybeSingle();

    if (error) throw error;

    res.json({ data });

  } catch (err) {
    res.status(500).json({ error: "Error al obtener conglomerado 😔"});
  }
});
// 📍 POST /api/asignar-conglomerado - Asignar brigada a conglomerado.
router.post("/asignar-conglomerado", verificarTokenExterno, esAdmin, async (req, res) => {
  try {
    const { brigada_id, conglomerado_id } = req.body;
    const { data, error } = await supabase.from("asignaciones_conglomerados").insert([{ brigada_id, conglomerado_id }]).select();
    if (error) throw error;
    res.json({ mensaje: "Asignación hecha ✅", asignacion: data[0] });
  } catch (err) {
    res.status(500).json({ error: "Error al asignar 😔" });
  }
});


// 🚀 Exportamos el router para usarlo en index.js
export default router;
