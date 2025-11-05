// 📂 src/routes/brigadas.js
// ----------------------------------------------------------
// Rutas para gestionar brigadas, usuarios/empleados y asignaciones.
// Requiere token válido y roles adecuados (admin para ciertas operaciones).

import express from "express";
import { supabase } from "../db/supabase.js";
import { verificarTokenExterno } from "../middleware/verificarTokenExterno.js";
import { crearUsuarioEnAuth } from "../services/authExternalService.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/**
 * Middleware esAdmin:
 * Verifica que el usuario autenticado tenga rol "admin" en la tabla usuarios.
 */
async function esAdmin(req, res, next) {
  try {
    const email = req.user.correo || req.user.email;
    if (!email) {
      return res.status(403).json({ error: "Token inválido o sin correo" });
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("correo", email)
      .maybeSingle();
    if (error) throw error;

    if (!data || data.rol !== "admin") {
      return res.status(403).json({ error: "Solo admins pueden hacer esto" });
    }
    next();
  } catch (err) {
    console.error("Error validando rol de usuario:", err);
    res.status(500).json({ error: "Error interno en validación de rol" });
  }
}


/**
 * GET /api/usuarios/:id
 * Obtener un solo usuario por su ID.
 * Acceso: cualquier usuario autenticado.
 */
router.get(
  "/usuarios/:id",
  verificarTokenExterno,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json({ data });
    } catch (err) {
      console.error("Error en GET /api/usuarios/:id:", err);
      res.status(500).json({ error: "Error al obtener usuario" });
    }
  }
);


/**
 * POST /api/usuarios
 * Crear un nuevo usuario/empleado.
 * Acceso: solo admin.
 * Body JSON:
 * { nombre_completo, correo, cargo, region, telefono, fecha_ingreso, descripcion, rol? }
 * rol por defecto: "brigadista"
 */
// ✅ CÓDIGO NUEVO (con integración Auth)

router.post("/usuarios", verificarTokenExterno, esAdmin, async (req, res) => {
  try {
    const {
      nombre_completo,
      correo,
      cedula,
      contraseña,  // ← RECIBIMOS CONTRASEÑA
      cargo,
      region,
      telefono,
      fecha_ingreso,
      descripcion,
      rol = "brigadista",
      hoja_vida_url
    } = req.body;

    // 1️⃣ VALIDAR QUE TENEMOS LA CONTRASEÑA
    if (!contraseña) {
      return res.status(400).json({ error: "La contraseña es obligatoria" });
    }

    // 2️⃣ CREAR USUARIO EN AUTH SERVICE
    console.log("🔐 Creando usuario en Auth Service...");
    const authUser = await crearUsuarioEnAuth(correo, contraseña);
    
    if (!authUser || !authUser.id) {
      return res.status(400).json({ 
        error: "Error creando usuario en Auth Service" 
      });
    }

    const auth_id = authUser.id; // ← Obtenemos el ID de Auth
    
    console.log("✅ Usuario creado en Auth con ID:", auth_id);

    // 3️⃣ INSERTAR EN BD BRIGADA CON el auth_id
    const foto_url = "url_de_foto";
    
    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre_completo,
          correo,
          cedula,
          cargo,
          region,
          telefono,
          fecha_ingreso,
          descripcion,
          rol,
          foto_url,
          hoja_vida_url: hoja_vida_url || null,
          auth_id  // ← AGREGAMOS EL auth_id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      mensaje: "✅ Empleado creado correctamente",
      usuario: data,
      auth_id: auth_id
    });
  } catch (err) {
    console.error("❌ Error en POST /api/usuarios:", err);
    res.status(500).json({ 
      error: "Error al crear empleado: " + err.message 
    });
  }
});


/**
 * POST /api/empleados
 * Mismo comportamiento que POST /api/usuarios (con integración Auth).
 * Acceso: solo admin.
 */
router.post("/empleados", verificarTokenExterno, esAdmin, async (req, res) => {
  try {
    const {
      nombre_completo,
      correo,
      cedula,
      contraseña,  // ← RECIBIMOS CONTRASEÑA
      cargo,
      region,
      telefono,
      fecha_ingreso,
      descripcion,
      rol = "brigadista",
      hoja_vida_url
    } = req.body;

    // 1️⃣ VALIDAR CONTRASEÑA
    if (!contraseña) {
      return res.status(400).json({ error: "La contraseña es obligatoria" });
    }

    // 2️⃣ CREAR EN AUTH SERVICE
    console.log("🔐 Creando usuario en Auth Service (POST /api/empleados)...");
    const authUser = await crearUsuarioEnAuth(correo, contraseña);
    
    if (!authUser || !authUser.id) {
      return res.status(400).json({ 
        error: "Error creando usuario en Auth Service" 
      });
    }

    const auth_id = authUser.id;
    console.log("✅ Usuario creado en Auth con ID:", auth_id);

    // 3️⃣ INSERTAR EN BD BRIGADA
    const foto_url = "url_de_foto";
    
    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre_completo,
          correo,
          cedula,
          cargo,
          region,
          telefono,
          fecha_ingreso,
          descripcion,
          rol,
          foto_url,
          hoja_vida_url: hoja_vida_url || null,
          auth_id  // ← AGREGAMOS auth_id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      mensaje: "✅ Empleado creado correctamente",
      usuario: data,
      auth_id: auth_id
    });
  } catch (err) {
    console.error("❌ Error en POST /api/empleados:", err);
    res.status(500).json({ 
      error: "Error al crear empleado: " + err.message 
    });
  }
});


/**
 * PUT /api/usuarios/:id/rol
 * Actualizar el rol de un usuario existente.
 * Body JSON: { rol }
 * Acceso: solo admin.
 */
router.put("/usuarios/:id/rol", verificarTokenExterno, esAdmin, async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;
  if (!rol) {
    return res.status(400).json({ error: "El campo 'rol' es obligatorio" });
  }
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .update({ rol })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    res.json({ mensaje: "Rol actualizado correctamente", usuario: data });
  } catch (err) {
    console.error("Error en PUT /api/usuarios/:id/rol:", err);
    res.status(500).json({ error: "Error interno al actualizar rol" });
  }
});

/**
 * GET /api/brigadas
 * Listar todas las brigadas.
 * Acceso: cualquier usuario autenticado.
 */
router.get("/brigadas", verificarTokenExterno, async (req, res) => {
  try {
    const { data, error } = await supabase.from("brigadas").select("*");
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error("Error obteniendo brigadas:", err);
    res.status(500).json({ error: "Error al obtener brigadas" });
  }
});

/**
 * GET /api/brigadas/:idbrigada
 * Detalle de una brigada específica.
 */
router.get("/brigadas/:idbrigada", verificarTokenExterno, async (req, res) => {
  try {
    const { idbrigada } = req.params;
    const { data, error } = await supabase
      .from("brigadas")
      .select("*")
      .eq("id", idbrigada)
      .maybeSingle();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error("Error en GET /api/brigadas/:idbrigada:", err);
    res.status(500).json({ error: "Error al obtener brigada" });
  }
});

/**
 * POST /api/brigadas/conformar
 * Crear una nueva brigada IFN con validación mínima.
 * Body JSON: { nombre, jefe_id, botanico_id, tecnico_id, coinvestigadores_ids: [] }
 */
router.post("/brigadas/conformar", verificarTokenExterno, async (req, res) => {
  try {
    const { nombre, jefe_id, botanico_id, tecnico_id, coinvestigadores_ids } = req.body;
    if (!jefe_id || !botanico_id || !tecnico_id || coinvestigadores_ids.length < 2) {
      return res.status(400).json({ error: "Requisitos mínimos IFN no cumplidos" });
    }

    const { data: brigada, error: err1 } = await supabase
      .from("brigadas")
      .insert({
        nombre,
        jefe_brigada_id: jefe_id,
        botanico_id,
        tecnico_auxiliar_id: tecnico_id,
        numero_coinvestigadores: coinvestigadores_ids.length
      })
      .select()
      .single();
    if (err1) throw err1;

    await supabase.from("validaciones_conformacion").insert({
      brigada_id: brigada.id,
      tiene_jefe: true,
      tiene_botanico: true,
      tiene_tecnico: true,
      numero_coinvestigadores: coinvestigadores_ids.length,
      validado_por: req.user.id
    });

    res.json({ brigada });
  } catch (err) {
    console.error("Error en POST /api/brigadas/conformar:", err);
    res.status(500).json({ error: "Error al conformar brigada" });
  }
});

/**
 * GET /api/brigadas/:id/validar
 * Obtener última validación de requisitos de la brigada.
 */
router.get("/brigadas/:id/validar", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("validaciones_conformacion")
      .select("tiene_jefe,tiene_botanico,tiene_tecnico,numero_coinvestigadores,cumple_minimo")
      .eq("brigada_id", id)
      .order("fecha_validacion", { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error en GET /api/brigadas/:id/validar:", err);
    res.status(500).json({ error: "Error al validar brigada" });
  }
});

// ===============================================
// ✅ ENDPOINTS ACTUALIZADOS PARA METODO INCREMENTAL
// ===============================================

/**
 * POST /api/brigadas/:id/asignar-rol
 * ⭐ VERSIÓN MEJORADA - Asigna rol dentro de brigada con nueva estructura
 * Body JSON: { usuario_id, rol_en_brigada }
 * Roles válidos: 'jefe_brigada', 'botanico', 'tecnico_auxiliar', 'coinvestigador'
 */
router.post("/brigadas/:id/asignar-rol", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, rol_en_brigada } = req.body;

    // Validar que el rol sea válido
    const rolesValidos = ['jefe_brigada', 'botanico', 'tecnico_auxiliar', 'coinvestigador'];
    if (!rolesValidos.includes(rol_en_brigada)) {
      return res.status(400).json({
        error: `Rol inválido. Roles válidos: ${rolesValidos.join(', ')}`
      });
    }

    // Validar que la brigada exista
    const { data: brigada, error: errBrigada } = await supabase
      .from('brigadas')
      .select('id')
      .eq('id', id)
      .single();

    if (errBrigada || !brigada) {
      return res.status(404).json({ error: 'Brigada no encontrada' });
    }

    // Validar que el usuario exista
    const { data: usuario, error: errUsuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', usuario_id)
      .single();

    if (errUsuario || !usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Insertar/actualizar en brigada_brigadistas con el nuevo rol
    const { data: asignacion, error: errAsign } = await supabase
      .from('brigada_brigadistas')
      .upsert(
        {
          brigada_id: id,
          usuario_id,
          rol_en_brigada,
          fecha_asignacion: new Date()
        },
        { onConflict: 'brigada_id,usuario_id' }
      )
      .select();

    if (errAsign) throw errAsign;

    res.json({
      mensaje: `Rol "${rol_en_brigada}" asignado correctamente`,
      asignacion: asignacion[0]
    });
  } catch (err) {
    console.error("Error en POST /api/brigadas/:id/asignar-rol:", err);
    res.status(500).json({ error: "Error al asignar rol" });
  }
});


/**
 * GET /api/brigadas/:id/miembros
 * ⭐ NUEVO - Obtener todos los miembros de una brigada con sus roles
 */
router.get("/brigadas/:id/miembros", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: miembros, error } = await supabase
      .from('brigada_brigadistas')
      .select(`
        id,
        rol_en_brigada,
        fecha_asignacion,
        usuarios:usuario_id (
          id,
          nombre_completo,
          correo,
          cargo,
          telefono
        )
      `)
      .eq('brigada_id', id);

    if (error) throw error;

    res.json({
      brigada_id: id,
      total_miembros: miembros.length,
      miembros
    });
  } catch (err) {
    console.error("Error en GET /api/brigadas/:id/miembros:", err);
    res.status(500).json({ error: "Error al obtener miembros de brigada" });
  }
});


/**
 * GET /api/brigadas/:id/checklist-conformacion
 * ⭐ NUEVO - Valida step-by-step si la brigada cumple con requisitos IFN
 * Implementa el MÉTODO INCREMENTAL del manual IFN
 */
router.get(
  '/brigadas/:id/checklist-conformacion',
  verificarTokenExterno,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Paso 1: Obtener brigada
      const { data: brigada, error: errBrigada } = await supabase
        .from('brigadas')
        .select('*')
        .eq('id', id)
        .single();

      if (errBrigada || !brigada) {
        return res.status(404).json({ error: 'Brigada no encontrada' });
      }

      // Paso 2: Contar miembros por rol desde brigada_brigadistas
      const { data: jefe } = await supabase
        .from('brigada_brigadistas')
        .select('*')
        .eq('brigada_id', id)
        .eq('rol_en_brigada', 'jefe_brigada');

      const { data: botanico } = await supabase
        .from('brigada_brigadistas')
        .select('*')
        .eq('brigada_id', id)
        .eq('rol_en_brigada', 'botanico');

      const { data: tecnico } = await supabase
        .from('brigada_brigadistas')
        .select('*')
        .eq('brigada_id', id)
        .eq('rol_en_brigada', 'tecnico_auxiliar');

      const { data: coinvestigadores } = await supabase
        .from('brigada_brigadistas')
        .select('*')
        .eq('brigada_id', id)
        .eq('rol_en_brigada', 'coinvestigador');

      // Paso 3: Validar equipos asignados
      const { data: equiposAsignados } = await supabase
        .from('equipos_brigada')
        .select('tipo_equipo')
        .eq('brigada_id', id);

      const { data: equiposCatalogo } = await supabase
        .from('catalogo_equipos_ifn')
        .select('nombre');

      const equiposFaltantes = equiposCatalogo
        .map((e) => e.nombre)
        .filter((n) => !equiposAsignados.some((a) => a.tipo_equipo === n));

      // Paso 4: Validar capacitación
      const capacitacionCompletada = brigada.capacitacion_completada || false;

      // Paso 5: Armar respuesta con checklist completo
      const checklist = {
        brigada_id: id,
        nombre_brigada: brigada.nombre,
        estado_conformacion: 'en_progreso',
        validacion: {
          jefe_brigada: {
            requerido: true,
            completado: jefe && jefe.length > 0,
            cantidad: jefe ? jefe.length : 0,
            detalles: jefe && jefe.length > 0 ? jefe : null
          },
          botanico: {
            requerido: true,
            completado: botanico && botanico.length > 0,
            cantidad: botanico ? botanico.length : 0,
            detalles: botanico && botanico.length > 0 ? botanico : null
          },
          tecnico_auxiliar: {
            requerido: true,
            completado: tecnico && tecnico.length > 0,
            cantidad: tecnico ? tecnico.length : 0,
            detalles: tecnico && tecnico.length > 0 ? tecnico : null
          },
          coinvestigadores: {
            requerido: true,
            cantidad_minima: 2,
            completado: coinvestigadores && coinvestigadores.length >= 2,
            cantidad: coinvestigadores ? coinvestigadores.length : 0,
            detalles: coinvestigadores && coinvestigadores.length >= 2 ? coinvestigadores : null
          },
          equipos_ifn: {
            requerido: true,
            completado: equiposFaltantes.length === 0,
            equipos_faltantes: equiposFaltantes,
            total_catalogo: equiposCatalogo.length,
            total_asignados: equiposAsignados ? equiposAsignados.length : 0
          },
          capacitacion: {
            requerido: true,
            completado: capacitacionCompletada
          }
        },
        cumple_minimo: false,
        errores: [],
        advertencias: [],
        acciones_pendientes: []
      };

      // Paso 6: Calcular cumplimiento mínimo
      const reqs = checklist.validacion;
      const cumpleMinimo =
        reqs.jefe_brigada.completado &&
        reqs.botanico.completado &&
        reqs.tecnico_auxiliar.completado &&
        reqs.coinvestigadores.completado &&
        reqs.equipos_ifn.completado;

      checklist.cumple_minimo = cumpleMinimo;

      if (cumpleMinimo) {
        checklist.estado_conformacion = 'conforme';
      }

      // Paso 7: Generar mensajes de error/advertencia/acciones
      if (!reqs.jefe_brigada.completado) {
        checklist.errores.push('❌ Falta asignar JEFE DE BRIGADA');
        checklist.acciones_pendientes.push({
          paso: 1,
          accion: 'Asignar jefe de brigada',
          endpoint: 'POST /api/brigadas/:id/asignar-rol',
          body: { usuario_id: 'uuid', rol_en_brigada: 'jefe_brigada' }
        });
      }
      if (!reqs.botanico.completado) {
        checklist.errores.push('❌ Falta asignar BOTÁNICO');
        checklist.acciones_pendientes.push({
          paso: 2,
          accion: 'Asignar botánico',
          endpoint: 'POST /api/brigadas/:id/asignar-rol',
          body: { usuario_id: 'uuid', rol_en_brigada: 'botanico' }
        });
      }
      if (!reqs.tecnico_auxiliar.completado) {
        checklist.errores.push('❌ Falta asignar TÉCNICO AUXILIAR');
        checklist.acciones_pendientes.push({
          paso: 3,
          accion: 'Asignar técnico auxiliar',
          endpoint: 'POST /api/brigadas/:id/asignar-rol',
          body: { usuario_id: 'uuid', rol_en_brigada: 'tecnico_auxiliar' }
        });
      }
      if (!reqs.coinvestigadores.completado) {
        checklist.errores.push(
          `❌ Faltan COINVESTIGADORES (tiene ${reqs.coinvestigadores.cantidad}, requiere mínimo 2)`
        );
        checklist.acciones_pendientes.push({
          paso: 4,
          accion: `Asignar ${2 - reqs.coinvestigadores.cantidad} coinvestigador(es) más`,
          endpoint: 'POST /api/brigadas/:id/asignar-rol',
          body: { usuario_id: 'uuid', rol_en_brigada: 'coinvestigador' }
        });
      }
      if (!reqs.equipos_ifn.completado) {
        checklist.errores.push(
          `❌ Equipos IFN incompletos. Faltantes: ${equiposFaltantes.join(', ')}`
        );
        checklist.acciones_pendientes.push({
          paso: 5,
          accion: 'Asignar equipos faltantes',
          endpoint: 'POST /api/brigadas/:id/equipos',
          body: { equipos: equiposFaltantes.map(e => ({ tipo_equipo: e, cantidad: 1 })) }
        });
      }
      if (!reqs.capacitacion.completado) {
        checklist.advertencias.push(
          '⚠️ ADVERTENCIA: Capacitación no completada aún'
        );
        checklist.acciones_pendientes.push({
          paso: 6,
          accion: 'Marcar capacitación como completada',
          endpoint: 'PUT /api/brigadas/:id/capacitacion',
          body: { capacitacion_completada: true }
        });
      }

      // Paso 8: Actualizar tabla de validaciones_conformacion
      await supabase
        .from('validaciones_conformacion')
        .upsert(
          {
            brigada_id: id,
            tiene_jefe: reqs.jefe_brigada.completado,
            tiene_botanico: reqs.botanico.completado,
            tiene_tecnico: reqs.tecnico_auxiliar.completado,
            numero_coinvestigadores: reqs.coinvestigadores.cantidad,
            equipos_completos: reqs.equipos_ifn.completado,
            capacitacion_completada: reqs.capacitacion.completado,
            fecha_validacion: new Date(),
            validado_por: req.user?.id || null,
            observaciones: `Validación incremental - ${new Date().toLocaleString('es-CO')}`
          },
          { onConflict: 'brigada_id' }
        );

      res.json(checklist);
    } catch (err) {
      console.error('Error en GET /api/brigadas/:id/checklist-conformacion:', err);
      res.status(500).json({
        error: 'Error al validar conformación de brigada'
      });
    }
  }
);


/**
 * POST /api/brigadas/:id/equipos
 * Asignar equipos a la brigada.
 * Body JSON: { equipos: [{ tipo_equipo, cantidad }, …] }
 */
router.post("/brigadas/:id/equipos", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const { equipos } = req.body;
    const inserts = equipos.map(e => ({ ...e, brigada_id: id }));
    const { error } = await supabase.from("equipos_brigada").insert(inserts);
    if (error) throw error;
    res.json({ message: "Equipos asignados" });
  } catch (err) {
    console.error("Error en POST /api/brigadas/:id/equipos:", err);
    res.status(500).json({ error: "Error al asignar equipos" });
  }
});

/**
 * GET /api/brigadas/:id/equipos/validar
 * Verifica si se asignaron todos los tipos de equipos del catálogo IFN.
 */
router.get("/brigadas/:id/equipos/validar", verificarTokenExterno, async (req, res) => {
  try {
    const { data: cat } = await supabase.from("catalogo_equipos_ifn").select("nombre");
    const { data: asg } = await supabase
      .from("equipos_brigada")
      .select("tipo_equipo")
      .eq("brigada_id", req.params.id);
    const faltantes = cat.map(c => c.nombre).filter(n => !asg.some(a => a.tipo_equipo === n));
    res.json({ completos: faltantes.length === 0, faltantes });
  } catch (err) {
    console.error("Error en GET /api/brigadas/:id/equipos/validar:", err);
    res.status(500).json({ error: "Error al validar equipos" });
  }
});
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

router.get("/empleados", verificarTokenExterno, async (req, res) => {
  try {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener empleados 😔" });
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

router.get("/conglomerados", verificarTokenExterno, async (req, res) => {
  try {
    const { data, error } = await supabase.from("conglomerados").select("*");
    if (error) throw error;

    res.json({ data });

  } catch (err) {
    res.status(500).json({ error: "Error al obtener conglomerados 😔" });
    res.json({ message: "Planificación guardada" });
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

/**
 * POST /api/conglomerados/:id/asignar-brigada
 * Asigna una brigada a un conglomerado si cumple requisitos mínimos.
 * Body JSON: { brigada_id }
 */
router.post("/conglomerados/:id/asignar-brigada", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const { brigada_id } = req.body;
    const { data: val } = await supabase
      .from("brigadas")
      .select("cumple_requisitos_minimos")
      .eq("id", brigada_id)
      .single();
    if (!val.cumple_requisitos_minimos) {
      return res.status(400).json({ error: "Brigada no cumple requisitos" });
    }
    const { error } = await supabase
      .from("asignaciones_conglomerados")
      .insert({ conglomerado_id: id, brigada_id, fecha_asignacion: new Date() });
    if (error) throw error;
    res.json({ message: "Brigada asignada" });
  } catch (err) {
    console.error("Error en POST /api/conglomerados/:id/asignar-brigada:", err);
    res.status(500).json({ error: "Error al asignar brigada" });
  }
});

/**
 * PUT /api/brigadas/:id/capacitacion
 * Marca la capacitación como completada para una brigada.
 * Body JSON: { capacitacion_completada: boolean }
 */
router.put("/brigadas/:id/capacitacion", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const { capacitacion_completada } = req.body;

    if (capacitacion_completada === undefined) {
      return res.status(400).json({ 
        error: "El campo 'capacitacion_completada' es obligatorio" 
      });
    }

    const { data, error } = await supabase
      .from("brigadas")
      .update({ capacitacion_completada })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      mensaje: "Capacitación actualizada correctamente",
      brigada: data
    });
  } catch (err) {
    console.error("Error en PUT /api/brigadas/:id/capacitacion:", err);
    res.status(500).json({ error: "Error al actualizar capacitación" });
  }
});


/**
 * GET /api/usuarios/me
 * Obtener datos del usuario autenticado desde el token
 */
router.get('/usuarios/me', verificarTokenExterno, async (req, res) => {
  try {
    console.log('🔍 Buscando usuario por correo:', req.user.email);
    
    // ✅ BUSCAR POR CORREO (no por ID de Auth)
    const email = req.user.email || req.user.correo;

    if (!email) {
      return res.status(400).json({ error: 'Email no disponible en token' });
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('correo', email)
      .single();
    
    if (error || !data) {
      console.log('❌ Usuario no encontrado:', error);
      return res.status(404).json({ error: 'Usuario no encontrado en Brigada' });
    }
    
    console.log('✅ Usuario encontrado:', data.correo);
    res.json({ usuario: data });
  } catch (err) {
    console.error('Error en GET /api/usuarios/me:', err);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
});



// Manejo final de rutas no definidas: devuelve JSON 404
router.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

export default router;
