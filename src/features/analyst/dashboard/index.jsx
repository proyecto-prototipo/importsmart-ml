import { useMemo, useState } from "react";
import "./styles.css";

const metrics = [["Registros analizados", "91,230", "Ventas + parque automotor", "🧪"], ["Pronósticos", "5", "Producto / región", "🧠"], ["Alta rotación", "2", "Oportunidades detectadas", "✨"], ["Datos pendientes", "3", "Requieren limpieza", "🧹"]];
const activities = ["Se detectó alta rotación en frenos para Arequipa", "Se homologaron 42 modelos de catálogo", "Pronóstico de demanda actualizado para Lima", "Reporte analítico listo para revisión"];
const regions = ["Todas", "Lima", "Arequipa", "La Libertad", "Piura", "Lambayeque"];
const periods = ["Mayo 2026", "Q2 2026", "Jun-Ago 2026", "Anual 2026"];
const chartRows = [
  { label: "Frenos", value: 92 },
  { label: "Transmisión", value: 84 },
  { label: "Motor", value: 68 },
  { label: "Suspensión", value: 61 },
  { label: "Refrigeración", value: 38 }
];

export default function AnalystDashboardPage() {
  const [region, setRegion] = useState("Todas");
  const [period, setPeriod] = useState("Mayo 2026");
  const [modal, setModal] = useState(null);
  const summary = useMemo(() => `${region} · ${period}`, [region, period]);

  return (
    <main className="analyst-dashboard-page">
      <section className="analyst-dashboard-hero">
        <div>
          <span className="analyst-dashboard-eyebrow">Analista comercial</span>
          <h2>Dashboard analítico</h2>
          <p>Indicadores de demanda, ventas y datos. Esta pantalla tiene sus propios estilos y código dentro de <strong>features/analyst/dashboard</strong>.</p>
        </div>
        <div className="analyst-dashboard-filters">
          <label>Región
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              {regions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Periodo
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <button onClick={() => setModal("resumen")}>Ver resumen</button>
        </div>
      </section>

      <section className="analyst-dashboard-metrics">
        {metrics.map(([label, value, hint, icon]) => (
          <article key={label}>
            <span>{icon}</span>
            <strong>{value}</strong>
            <h3>{label}</h3>
            <p>{hint}</p>
          </article>
        ))}
      </section>

      <section className="analyst-dashboard-grid">
        <article className="analyst-dashboard-panel">
          <div className="analyst-dashboard-panel-head">
            <div>
              <span>Ranking</span>
              <h3>Demanda proyectada por categoría</h3>
            </div>
            <button onClick={() => setModal("grafico")}>Ampliar</button>
          </div>
          <div className="analyst-dashboard-bars">
            {chartRows.map((row) => (
              <div className="analyst-dashboard-bar" key={row.label}>
                <div><strong>{row.label}</strong><small>{row.value}%</small></div>
                <span><i style={{ width: `${row.value}%` }} /></span>
              </div>
            ))}
          </div>
        </article>
        <article className="analyst-dashboard-panel">
          <div className="analyst-dashboard-panel-head">
            <div>
              <span>Actividad</span>
              <h3>Últimos movimientos</h3>
            </div>
            <button onClick={() => setModal("actividad")}>Detalle</button>
          </div>
          <ul className="analyst-dashboard-timeline">
            {activities.map((item, index) => (
              <li key={item}><span>{index + 1}</span><p>{item}</p></li>
            ))}
          </ul>
        </article>
      </section>

      {modal && (
        <div className="analyst-dashboard-modal-backdrop" onClick={() => setModal(null)}>
          <section className="analyst-dashboard-modal" onClick={(event) => event.stopPropagation()}>
            <button className="analyst-dashboard-close" onClick={() => setModal(null)}>×</button>
            <span className="analyst-dashboard-eyebrow">Ventana rápida</span>
            <h3>{modal === "resumen" ? "Resumen filtrado" : modal === "grafico" ? "Detalle del gráfico" : "Detalle de actividad"}</h3>
            <p>Vista generada para <strong>{summary}</strong>. En un PMV esta ventana simula el análisis y permite demostrar navegación, filtros y ventanas emergentes sin conectar todavía una base de datos real.</p>
            <div className="analyst-dashboard-modal-actions">
              <button onClick={() => setModal(null)}>Entendido</button>
              <button onClick={() => alert("Acción simulada correctamente")}>Ejecutar acción demo</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
