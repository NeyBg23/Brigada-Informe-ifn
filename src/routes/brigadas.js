// 📂 src/routes/brigadas.js

import express from "express";                // Framework web
import supabase from "../db/supabase.js";     // Conexión a Supabase
import { verificarTokenExterno } from "../middleware/verificarTokenExterno.js"; // 🛡️ Nuevo middleware

const router = express.Router(); // 🚪 Creamos el router

/**
 * 📍 Ruta GET /api/brigadas
 * 
 * Esta ruta está protegida con el middleware verificarTokenExterno.
 * Solo los usuarios con un token válido pueden entrar.
 */
router.get("/", verificarTokenExterno, async (req, res) => {
  try {
    // 🧑‍💻 req.user viene del token verificado por AutenVerifi
    const usuario = req.user;


    console.log("👤 Usuario autenticado:", usuario.email);

    // 🚀 Obtenemos todas las brigadas desde Supabase
    const { data, error } = await supabase.from("brigadas").select("*");
    if (error) throw error;

    // ✅ Si todo va bien, respondemos con la info y el usuario autenticado
    res.json({
      mensaje: "✅ Acceso permitido. Token verificado.",
      role: "admin",
      usuario: usuario,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
