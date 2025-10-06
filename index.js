import express from "express"; // 🎺 Llamamos a Express (la librería que maneja las rutas y el servidor)
import dotenv from "dotenv";  // 🧩 Sirve para leer el archivo .env (donde guardamos claves secretas)
import cors from "cors";  //🛡️ Permite que otras apps (como el frontend) hablen con este servidor
import brigadasRoutes from "./src/routes/brigadas.js"; // 👈 importante: ruta de brigadas // 🧭 Traemos las rutas de brigadas

dotenv.config();   // 📦 Activa las variables secretas (como SUPABASE_URL, PORT, etc.)  

const app = express();   // 🚀 Crea la app de Express  // 🎬 Creamos nuestra aplicación Express
app.use(cors());   //🛡️ Habilita CORS para todas las rutas  // 🔓 Permitimos peticiones desde fuera
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "Brigada Service funcionando 🚀" });
});

// Rutas principales del microservicio
app.use("/api/brigadas", brigadasRoutes);
// 🗺️ Si alguien entra a http://localhost:5000/api/brigadas → irá al archivo brigadas.js

// Puerto de escucha O ENCENDEMOS EL SERVIDOR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Brigada Service corriendo en http://localhost:${PORT}`);
});
// Nota: Asegúrate de tener las variables de entorno configuradas en un archivo .env
// SUPABASE_URL y SUPABASE_KEY para la conexión a Supabase.