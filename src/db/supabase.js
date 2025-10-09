import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_ROLE_KEY = process.env.SUPABASE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL || !SUPABASE_ROLE_KEY) {
  throw new Error("❌ Faltan variables SUPABASE_URL o SUPABASE_ROLE_KEY en .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ROLE_KEY);