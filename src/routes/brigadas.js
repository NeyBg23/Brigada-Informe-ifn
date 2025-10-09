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
  try {
    const { nombreArchivo } = req.params;
    const decodedFileName = decodeURIComponent(nombreArchivo);

    console.log("🗂 Solicitando archivo:", decodedFileName);

    // ✅ Construimos correctamente la ruta dentro del bucket
    const filePath = `empleados/${decodedFileName}`;
    console.log("📁 filePath:", filePath);

    const { data, error } = await supabase.storage
      .from("hojas_de_vida")
      .createSignedUrl("empleados/1759958970669_Certificado Semillero Carlos.pdf", 600);

    return res.status(500).json({ message: data, test: "Probando"})

    if (error || !data) {
      console.error("❌ Error creando signed URL:", error);
      return res.status(400).json({
        error: `Error generando URL firmada: ${error?.message || "Desconocido"} — ${filePath}`,
      });
    }

    res.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error("🔥 Error en /hoja-vida:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});




// Crear Empleados
router.post("/empleados", verificarTokenExterno, async (req, res) => {
  try {
    const {
      nombre_completo,
      correo,
      cedula,
      telefono,
      region,
      descripcion,
      hoja_vida_url, // ✅ ya viene directo del frontend (Subido a Storage)
    } = req.body;

    // 👷‍♂️ Insertar en la base de datos
    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre_completo,
          correo,
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

    res.json({
      mensaje: "Empleado creado ✅",
      empleado: data[0],
    });
  } catch (err) {
    console.error("🔥 Error en /empleados:", err);
    res.status(500).json({ error: "Error al crear empleado 😔" });
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



// 📍 POST /api/conglomerados - Crear conglomerado (nuevo).
router.post("/conglomerados", verificarTokenExterno, esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, ubicacion } = req.body;
    const { data, error } = await supabase.from("conglomerados").insert([{ nombre, descripcion, ubicacion }]).select();
    if (error) throw error;
    res.json({ mensaje: "Conglomerado creado ✅", conglomerado: data[0] });
  } catch (err) {
    res.status(500).json({ error: "Error al crear conglomerado 😔" });
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
