import { supabase } from "./supabaseClient.js";

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from("admin_users_security")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error conectando con Supabase:", error.message);
    return false;
  }

  console.log("Conexión correcta con Supabase:", data);
  return true;
}