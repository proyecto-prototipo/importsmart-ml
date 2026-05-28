import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const regions = ["Todas"];
const periods = ["Todos", "Mayo 2026", "Q2 2026", "2026-Q1", "Junio 2026"];

const CHART_COLORS = [
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#14b8a6"
];

function groupByField(rows, field) {
  const grouped = {};

  (rows ?? []).forEach((row) => {
    const key = row[field] || "Sin dato";
    grouped[key] = (grouped[key] || 0) + 1;
  });

  return Object.entries(grouped).map(([name, value]) => ({
    name,
    value
  }));
}

function badgeRisk(value) {
  const text = String(value ?? "").toLowerCase();

  if (text.includes("alto")) return "danger";
  if (text.includes("medio")) return "warning";
  return "success";
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function AdminDashboardPage() {
  const [region, setRegion] = useState("Todas");
  const [period, setPeriod] = useState("Todos");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState([
    { label: "Usuarios activos", value: "0", hint: "Permisos vigentes", icon: "👥" },
    { label: "Fuentes integradas", value: "0", hint: "Registros conectados", icon: "📥" },
    { label: "Alertas pendientes", value: "0", hint: "Seguimiento requerido", icon: "🔔" },
    { label: "Modelo productivo", value: "-", hint: "Sin modelo activo", icon: "🤖" }
  ]);

  const [catalogCategoryData, setCatalogCategoryData] = useState([]);
  const [usersRoleData, setUsersRoleData] = useState([]);
  const [reportsStatusData, setReportsStatusData] = useState([]);
  const [alertsPriorityData, setAlertsPriorityData] = useState([]);
  const [activities, setActivities] = useState([]);

  const summary = useMemo(() => `${region} · ${period}`, [region, period]);

  useEffect(() => {
    loadDashboard();
  }, [region, period]);

  async function loadDashboard() {
    setLoading(true);

    try {
      let catalogQuery = supabase
        .from("admin_catalog_parts")
        .select("id, categoria, region, estado, rotacion");

      if (region !== "Todas") {
        catalogQuery = catalogQuery.eq("region", region);
      }

      let reportsQuery = supabase
        .from("admin_reports")
        .select("id, reporte, tipo, periodo, estado, responsable");

      if (period !== "Todos") {
        reportsQuery = reportsQuery.eq("periodo", period);
      }

      const [
        usersResponse,
        catalogResponse,
        reportsResponse,
        alertsResponse,
        modelsResponse,
        auditResponse,
        integrationResponse
      ] = await Promise.all([
        supabase.from("admin_users_security").select("id, rol, estado"),
        catalogQuery,
        reportsQuery,
        supabase.from("admin_alerts").select("id, prioridad, estado, tipo"),
        supabase
          .from("admin_model_admin")
          .select("id, version, precision, estado")
          .order("id", { ascending: false }),
        supabase
          .from("admin_audit_log")
          .select("id, fecha, usuario, accion, modulo, riesgo")
          .order("id", { ascending: false })
          .limit(6),
        supabase.from("admin_data_integration").select("id, fuente")
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (catalogResponse.error) throw catalogResponse.error;
      if (reportsResponse.error) throw reportsResponse.error;
      if (alertsResponse.error) throw alertsResponse.error;
      if (modelsResponse.error) throw modelsResponse.error;
      if (auditResponse.error) throw auditResponse.error;
      if (integrationResponse.error) throw integrationResponse.error;

      const users = usersResponse.data ?? [];
      const catalog = catalogResponse.data ?? [];
      const reports = reportsResponse.data ?? [];
      const alerts = alertsResponse.data ?? [];
      const models = modelsResponse.data ?? [];
      const audit = auditResponse.data ?? [];
      const integrations = integrationResponse.data ?? [];

      const activeUsers = users.filter((item) => item.estado === "Activo").length;
      const pendingAlerts = alerts.filter(
        (item) => item.estado === "No leído" || item.estado === "Pendiente"
      ).length;

      const productiveModel =
        models.find((item) => item.estado === "Producción") || models[0];

      setMetrics([
        {
          label: "Usuarios activos",
          value: String(activeUsers),
          hint: `${users.length} usuarios registrados`,
          icon: "👥"
        },
        {
          label: "Fuentes integradas",
          value: String(integrations.length),
          hint: "Conectadas al sistema",
          icon: "📥"
        },
        {
          label: "Alertas pendientes",
          value: String(pendingAlerts),
          hint: "Requieren seguimiento",
          icon: "🔔"
        },
        {
          label: "Modelo productivo",
          value: productiveModel?.version ?? "-",
          hint: productiveModel?.precision
            ? `Precisión ${productiveModel.precision}`
            : "Sin precisión registrada",
          icon: "🤖"
        }
      ]);

      setCatalogCategoryData(groupByField(catalog, "categoria"));
      setUsersRoleData(groupByField(users, "rol"));
      setReportsStatusData(groupByField(reports, "estado"));
      setAlertsPriorityData(groupByField(alerts, "prioridad"));
      setActivities(audit);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div>
          <span className="admin-dashboard-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗 </h2>
          <p>
            Aquí verás un resumen general del sistema con métricas y gráficos conectados a los
            módulos reales del rol administrador.
          </p>
        </div>

        <div className="admin-dashboard-filters">
          <label>
            Región
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              {regions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Periodo
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <button onClick={() => setModal("resumen")}>
            {loading ? "Actualizando..." : "Ver resumen"}
          </button>
        </div>
      </section>

      <section className="admin-dashboard-metrics">
        {metrics.map((item) => (
          <article key={item.label}>
            <span>{item.icon}</span>
            <strong>{item.value}</strong>
            <h3>{item.label}</h3>
            <p>{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-grid admin-dashboard-grid-charts">
        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-head">
            <div>
              <span>Catálogo</span>
              <h3>Repuestos por categoría</h3>
            </div>
          </div>

          <div className="admin-dashboard-chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={catalogCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {catalogCategoryData.map((_, index) => (
                    <Cell
                      key={`cat-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-head">
            <div>
              <span>Usuarios</span>
              <h3>Usuarios por rol</h3>
            </div>
          </div>

          <div className="admin-dashboard-chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={usersRoleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label
                >
                  {usersRoleData.map((_, index) => (
                    <Cell
                      key={`role-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-head">
            <div>
              <span>Reportes</span>
              <h3>Reportes por estado</h3>
            </div>
          </div>

          <div className="admin-dashboard-chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={reportsStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {reportsStatusData.map((_, index) => (
                    <Cell
                      key={`rep-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-head">
            <div>
              <span>Alertas</span>
              <h3>Alertas por prioridad</h3>
            </div>
          </div>

          <div className="admin-dashboard-chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={alertsPriorityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  label
                >
                  {alertsPriorityData.map((_, index) => (
                    <Cell
                      key={`alert-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-head">
            <div>
              <span>Actividad</span>
              <h3>Últimos movimientos</h3>
            </div>
          </div>

          <ul className="admin-dashboard-timeline">
            {activities.length === 0 ? (
              <li>
                <span>•</span>
                <p>No hay actividad registrada todavía.</p>
              </li>
            ) : (
              activities.map((item, index) => (
                <li key={item.id ?? index}>
                  <span>{index + 1}</span>
                  <div>
                    <p>
                      <strong>{item.usuario}</strong> · {item.accion}
                    </p>
                    <small>
                      {item.modulo} · {formatDateTime(item.fecha)}
                    </small>
                    <div
                      className={`admin-dashboard-risk ${badgeRisk(item.riesgo)}`}
                    >
                      Riesgo: {item.riesgo}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      {modal && (
        <div
          className="admin-dashboard-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-dashboard-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="admin-dashboard-close" onClick={() => setModal(null)}>
              ×
            </button>
            <span className="admin-dashboard-eyebrow">Ventana rápida</span>
            <h3>Resumen del dashboard</h3>
            <p>
              Vista generada para <strong>{summary}</strong>. Aquí puedes revisar
              métricas de usuarios, catálogo, reportes, alertas y actividad del
              sistema conectados a Supabase.
            </p>
            <div className="admin-dashboard-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}