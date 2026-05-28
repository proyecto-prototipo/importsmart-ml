export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        message: "Método no permitido"
      });
    }

    const authHeader = req.headers.authorization;

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        ok: false,
        message: "Faltan variables de entorno"
      });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/system_keep_alive?id=eq.1`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          touched_at: new Date().toISOString(),
          source: "vercel-cron",
          note: "Ping automático desde Vercel para mantener activo Supabase"
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        ok: false,
        message: "Error actualizando Supabase",
        result
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Keep alive ejecutado correctamente",
      result
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error ejecutando keep alive",
      error: error.message
    });
  }
}