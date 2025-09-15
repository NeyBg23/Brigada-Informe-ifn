import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "Brigada Service funcionando 🚀" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Brigada Service corriendo en http://localhost:${PORT}`);
});