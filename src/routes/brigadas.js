// 📂 src/routes/brigadas.js
// ----------------------------------------------------------
// Rutas para gestionar brigadas, usuarios y asignaciones.
// Requiere token válido y roles adecuados.

import express from "express";
import { supabase } from "../db/supabase.js";
import { verificarTokenExterno } from "../middleware/verificarTokenExterno.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Helper: valida que el usuario sea admin
async function esAdmin(req, res, next) {
  try {
    const email = req.user.correo || req.user.email;
    if (!email) return res.status(403).json({ error: "Token inválido o sin correo" });

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
    console.error("Error validando rol:", err);
    res.status(500).json({ error: "Error interno en validación de rol" });
  }
}

// GET /api/usuarios – Listar todos los usuarios
router.get("/usuarios", verificarTokenExterno, async (req, res) => {
  try {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (error) throw error;
    res.json({ usuario: req.user, data });
  } catch (err) {
    console.error("Error obteniendo usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// POST /api/usuarios – Crear empleado (solo admin)
router.post("/usuarios", verificarTokenExterno, esAdmin, async (req, res) => {
  try {
    const {
      nombre_completo,
      correo,
      cargo,
      region,
      telefono,
      fecha_ingreso,
      descripcion,
      rol = "brigadista"
    } = req.body;
    const foto_url = "url_de_foto";      // TODO: reemplazar con upload real
    const hoja_vida_url = "url_de_pdf";  // TODO: reemplazar con upload real

    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre_completo,
          correo,
          cargo,
          region,
          telefono,
          fecha_ingreso,
          descripcion,
          rol,
          foto_url,
          hoja_vida_url
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ mensaje: "Empleado creado correctamente", usuario: data });
  } catch (err) {
    console.error("Error creando usuario:", err);
    res.status(500).json({ error: "Error al crear empleado" });
  }
});

/**
 * PUT /api/usuarios/:id/rol
 * Cambia el rol de un usuario existente.
 * Sólo accesible por admins.
 */
router.put(
  "/usuarios/:id/rol",
  verificarTokenExterno,
  esAdmin,
  async (req, res) => {
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
      console.error("Error actualizando rol:", err);
      res.status(500).json({ error: "Error interno al actualizar rol" });
    }
  }
);

// GET /api/brigadas – Listar brigadas
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

// GET /api/brigadas/:idbrigada – Detalle de brigada
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
    console.error("Error obteniendo detalle brigada:", err);
    res.status(500).json({ error: "Error al obtener brigada" });
  }
});

// POST /api/brigadas/conformar – Conformar nueva brigada IFN
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
    console.error("Error conformando brigada:", err);
    res.status(500).json({ error: "Error al conformar brigada" });
  }
});

// GET /api/brigadas/:id/validar – Verificar requisitos
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
    console.error("Error validando brigada:", err);
    res.status(500).json({ error: "Error al validar brigada" });
  }
});

// POST /api/brigadas/:id/asignar-rol – Asignar rol en brigada
router.post("/brigadas/:id/asignar-rol", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, rol } = req.body;
    const colMap = {
      jefe: "jefe_brigada_id",
      botanico: "botanico_id",
      tecnico: "tecnico_auxiliar_id"
    };

    if (rol === "coinvestigador") {
      await supabase.from("brigada_brigadistas").insert({ brigada_id: id, usuario_id });
    } else if (colMap[rol]) {
      await supabase.from("brigadas").update({ [colMap[rol]]: usuario_id }).eq("id", id);
    } else {
      return res.status(400).json({ error: "Rol inválido" });
    }

    res.json({ message: "Rol asignado" });
  } catch (err) {
    console.error("Error asignando rol brigada:", err);
    res.status(500).json({ error: "Error al asignar rol" });
  }
});

// POST /api/brigadas/:id/equipos – Asignar equipos
router.post("/brigadas/:id/equipos", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const { equipos } = req.body;
    const inserts = equipos.map(e => ({ ...e, brigada_id: id }));
    const { error } = await supabase.from("equipos_brigada").insert(inserts);
    if (error) throw error;
    res.json({ message: "Equipos asignados" });
  } catch (err) {
    console.error("Error asignando equipos:", err);
    res.status(500).json({ error: "Error al asignar equipos" });
  }
});

// GET /api/brigadas/:id/equipos/validar – Comprobar equipos
router.get("/brigadas/:id/equipos/validar", verificarTokenExterno, async (req, res) => {
  try {
    const { data: cat } = await supabase.from("catalogo_equipos_ifn").select("nombre");
    const { data: asg } = await supabase.from("equipos_brigada").select("tipo_equipo").eq("brigada_id", req.params.id);
    const faltantes = cat.map(c => c.nombre).filter(n => !asg.some(a => a.tipo_equipo === n));
    res.json({ completos: faltantes.length === 0, faltantes });
  } catch (err) {
    console.error("Error validando equipos:", err);
    res.status(500).json({ error: "Error al validar equipos" });
  }
});

// POST /api/conglomerados/:id/planificar – Planificación previa
router.post("/conglomerados/:id/planificar", verificarTokenExterno, async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    const { error } = await supabase.from("asignaciones_conglomerados").update(datos).eq("id", id);
    if (error) throw error;
    res.json({ message: "Planificación guardada" });
  } catch (err) {
    console.error("Error planificando asignación:", err);
    res.status(500).json({ error: "Error al planificar asignación" });
  }
});

// POST /api/conglomerados/:id/asignar-brigada – Asignar brigada
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
    console.error("Error asignando brigada a conglomerado:", err);
    res.status(500).json({ error: "Error al asignar brigada" });
  }
});

export default router;
