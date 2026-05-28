import { supabase } from "./supabaseClient.js";

export function getCurrentAuditUser() {
  try {
    const storedUser = localStorage.getItem("currentUser");

    if (!storedUser) return "Sistema";

    const user = JSON.parse(storedUser);

    return (
      user.nombre ||
      user.name ||
      user.fullName ||
      user.roleLabel ||
      user.correo ||
      user.email ||
      "Sistema"
    );
  } catch {
    return "Sistema";
  }
}

export async function logAuditAction({
  usuario,
  accion,
  modulo,
  detalle = "",
  metadata = {}
}) {
  const auditUser = usuario || getCurrentAuditUser();

  const { data, error } = await supabase.rpc("registrar_auditoria", {
    p_usuario: auditUser,
    p_accion: accion,
    p_modulo: modulo,
    p_detalle: detalle,
    p_metadata: metadata
  });

  if (error) {
    console.error("Error registrando auditoría:", error);
    return null;
  }

  return data;
}