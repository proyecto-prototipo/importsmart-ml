import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const initialRows = [
  {
    id: 1,
    producto: "Kit embrague Hilux",
    region: "Lima",
    periodo: "Jun-Ago 2026",
    demanda: "1,620 uds",
    confianza: "91%",
    probabilidad: "Alta",
    tendencia: "Creciente",
    modeloVersion: "v2.4",
    fuente: "Forecasting publicado",
    estado: "Publicado"
  },
  {
    id: 2,
    producto: "Pastillas freno Accent",
    region: "Arequipa",
    periodo: "Jun-Ago 2026",
    demanda: "3,150 uds",
    confianza: "88%",
    probabilidad: "Alta",
    tendencia: "Creciente",
    modeloVersion: "v2.4",
    fuente: "Forecasting publicado",
    estado: "Publicado"
  },
  {
    id: 3,
    producto: "Filtro aceite Corolla",
    region: "Lambayeque",
    periodo: "Jun-Ago 2026",
    demanda: "1,180 uds",
    confianza: "81%",
    probabilidad: "Media",
    tendencia: "Estable",
    modeloVersion: "v2.4",
    fuente: "Forecasting publicado",
    estado: "Publicado"
  },
  {
    id: 4,
    producto: "Amortiguador NP300",
    region: "La Libertad",
    periodo: "Jun-Ago 2026",
    demanda: "970 uds",
    confianza: "84%",
    probabilidad: "Media",
    tendencia: "Creciente",
    modeloVersion: "v2.4",
    fuente: "Forecasting publicado",
    estado: "Publicado"
  },
  {
    id: 5,
    producto: "Bomba de agua Spark",
    region: "Piura",
    periodo: "Jun-Ago 2026",
    demanda: "210 uds",
    confianza: "69%",
    probabilidad: "Baja",
    tendencia: "Descendente",
    modeloVersion: "v2.4",
    fuente: "Forecasting publicado",
    estado: "Publicado"
  }
];

const columns = [
  {
    key: "producto",
    label: "Producto"
  },
  {
    key: "region",
    label: "Región"
  },
  {
    key: "periodo",
    label: "Periodo"
  },
  {
    key: "demanda",
    label: "Demanda"
  },
  {
    key: "confianza",
    label: "Confianza"
  },
  {
    key: "probabilidad",
    label: "Probabilidad"
  },
  {
    key: "tendencia",
    label: "Tendencia"
  }
];

const filterFields = ["region", "probabilidad", "tendencia"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "download", label: "Descargar" }
];

const formFields = [
  "producto",
  "region",
  "periodo",
  "demanda",
  "confianza",
  "probabilidad",
  "tendencia"
];

const fieldLabels = Object.fromEntries(
  columns.map((column) => [column.key, column.label])
);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNumber(value) {
  const number = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-PE").format(value);
}

function formatPercent(value) {
  const number = parseNumber(value);
  return `${number.toFixed(1).replace(".0", "")}%`;
}

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function trendIcon(value) {
  const text = normalize(value);

  if (text.includes("crec")) return "↗";
  if (text.includes("desc")) return "↘";
  return "→";
}

function downloadCsv(filename, rows) {
  const headers = columns.map((column) => column.label).join(",");

  const body = rows
    .map((row) =>
      columns
        .map((column) =>
          `"${String(row[column.key] ?? "").replaceAll('"', '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob([headers + "\n" + body], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function badgeClass(value) {
  const text = normalize(value);

  if (
    text.includes("alta") ||
    text.includes("activo") ||
    text.includes("aprob") ||
    text.includes("listo") ||
    text.includes("produccion") ||
    text.includes("validado") ||
    text.includes("operativa") ||
    text.includes("rentable") ||
    text.includes("bajo") ||
    text.includes("normal") ||
    text.includes("publicado") ||
    text.includes("creciente")
  ) {
    return "success";
  }

  if (
    text.includes("pend") ||
    text.includes("revision") ||
    text.includes("medio") ||
    text.includes("media") ||
    text.includes("observ") ||
    text.includes("pruebas") ||
    text.includes("generacion") ||
    text.includes("estable")
  ) {
    return "warning";
  }

  if (
    text.includes("rechaz") ||
    text.includes("critico") ||
    (text.includes("alta") && text.includes("riesgo")) ||
    text.includes("alto") ||
    text.includes("no leido") ||
    text.includes("sobrestock") ||
    text.includes("descendente")
  ) {
    return "danger";
  }

  return "neutral";
}

function createBlankRow() {
  const row = { id: Date.now() };

  formFields.forEach((key) => {
    row[key] = "";
  });

  return row;
}

export default function ConsultationForecastViewPage() {
  const [rows, setRows] = useState(initialRows);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState(() =>
    Object.fromEntries(filterFields.map((field) => [field, "Todos"]))
  );

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(createBlankRow());
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);

    const [forecastResult, modelResult] = await Promise.all([
      supabase
        .from("admin_forecast_published")
        .select("*")
        .order("id", { ascending: true }),

      supabase
        .from("admin_model_admin")
        .select("*")
        .eq("estado", "Producción")
        .order("id", { ascending: true })
        .limit(1)
    ]);

    if (forecastResult.error) {
      console.error("Error cargando forecasting:", forecastResult.error);
      showToast("No se pudieron cargar las predicciones publicadas");
      setRows(initialRows);
      setLoading(false);
      return;
    }

    if (modelResult.error) {
      console.error("Error cargando modelo productivo:", modelResult.error);
      setModelInfo(null);
    } else {
      setModelInfo(modelResult.data?.[0] ?? null);
    }

    setRows(
      (forecastResult.data ?? []).length > 0 ? forecastResult.data : initialRows
    );

    setLoading(false);
  }

  const optionsByFilter = useMemo(() => {
    return Object.fromEntries(
      filterFields.map((field) => [
        field,
        ["Todos", ...new Set(rows.map((row) => row[field]).filter(Boolean))]
      ])
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = normalize(search);

    return rows.filter((row) => {
      const matchesText =
        !term ||
        normalize(
          `${row.producto ?? ""} ${row.region ?? ""} ${row.periodo ?? ""} ${row.demanda ?? ""} ${row.confianza ?? ""} ${row.probabilidad ?? ""} ${row.tendencia ?? ""} ${row.estado ?? ""} ${row.modeloVersion ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  const totalDemand = useMemo(() => {
    return rows.reduce((sum, row) => sum + parseNumber(row.demanda), 0);
  }, [rows]);

  const averageConfidence = useMemo(() => {
    if (rows.length === 0) return 0;

    const total = rows.reduce((sum, row) => sum + parseNumber(row.confianza), 0);

    return total / rows.length;
  }, [rows]);

  const highProbabilityCount = useMemo(() => {
    return rows.filter((row) => normalize(row.probabilidad).includes("alta"))
      .length;
  }, [rows]);

  const topForecast = useMemo(() => {
    return [...rows].sort(
      (a, b) => parseNumber(b.demanda) - parseNumber(a.demanda)
    )[0];
  }, [rows]);

  const demandRanking = useMemo(() => {
    const max = Math.max(...rows.map((row) => parseNumber(row.demanda)), 1);

    return [...rows]
      .sort((a, b) => parseNumber(b.demanda) - parseNumber(a.demanda))
      .slice(0, 5)
      .map((row) => ({
        label: row.producto,
        region: row.region,
        value: parseNumber(row.demanda),
        percent: Math.round((parseNumber(row.demanda) / max) * 100)
      }));
  }, [rows]);

  const confidenceRanking = useMemo(() => {
    const max = Math.max(...rows.map((row) => parseNumber(row.confianza)), 1);

    return [...rows]
      .sort((a, b) => parseNumber(b.confianza) - parseNumber(a.confianza))
      .slice(0, 5)
      .map((row) => ({
        label: row.producto,
        value: parseNumber(row.confianza),
        percent: Math.round((parseNumber(row.confianza) / max) * 100)
      }));
  }, [rows]);

  const probabilityStats = useMemo(() => {
    const total = Math.max(rows.length, 1);

    const alta = rows.filter((row) =>
      normalize(row.probabilidad).includes("alta")
    ).length;

    const media = rows.filter((row) =>
      normalize(row.probabilidad).includes("media")
    ).length;

    const baja = rows.filter((row) =>
      normalize(row.probabilidad).includes("baja")
    ).length;

    const altaPercent = Math.round((alta / total) * 100);
    const mediaPercent = Math.round((media / total) * 100);
    const bajaPercent = Math.max(0, 100 - altaPercent - mediaPercent);

    return {
      alta,
      media,
      baja,
      altaPercent,
      mediaPercent,
      bajaPercent,
      gradient: `conic-gradient(#16a34a 0 ${altaPercent}%, #f59e0b ${altaPercent}% ${
        altaPercent + mediaPercent
      }%, #ef4444 ${altaPercent + mediaPercent}% 100%)`
    };
  }, [rows]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function openCreate() {
    setForm(createBlankRow());
    setModal({ type: "form", title: "Nuevo registro", mode: "create" });
  }

  function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar registro", mode: "edit" });
  }

  function saveForm(event) {
    event.preventDefault();

    if (modal?.mode === "create") {
      setRows((prev) => [{ ...form, id: Date.now() }, ...prev]);
      showToast("Registro creado correctamente");
    } else {
      setRows((prev) =>
        prev.map((row) => (row.id === form.id ? form : row))
      );
      showToast("Cambios guardados correctamente");
    }

    setModal(null);
  }

  function updateRow(id, updates) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  }

  function runAction(actionId, row) {
    if (actionId === "view") {
      setModal({ type: "detail", row });
      return;
    }

    if (actionId === "edit") {
      openEdit(row);
      return;
    }

    if (actionId === "delete") {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Registro eliminado");
      return;
    }

    if (actionId === "approve") {
      updateRow(row.id, { estado: "Aprobado" });
      showToast("Aprobado correctamente");
      return;
    }

    if (actionId === "reject") {
      updateRow(row.id, { estado: "Rechazado" });
      showToast("Registro observado o rechazado");
      return;
    }

    if (actionId === "send") {
      updateRow(row.id, { estado: "En revisión" });
      showToast("Propuesta enviada a gerencia");
      return;
    }

    if (actionId === "validate") {
      updateRow(row.id, { estado: "Validado", errores: "0" });
      showToast("Validación simulada completada");
      return;
    }

    if (actionId === "clean") {
      updateRow(row.id, { estado: "Corregido", errores: "0" });
      showToast("Limpieza simulada ejecutada");
      return;
    }

    if (actionId === "read") {
      updateRow(row.id, { estado: "Leído" });
      showToast("Alerta marcada como leída");
      return;
    }

    if (actionId === "backup") {
      updateRow(row.id, { estado: "Respaldada" });
      showToast("Respaldo generado");
      return;
    }

    if (actionId === "deploy") {
      updateRow(row.id, { estado: "Producción" });
      showToast("Modelo publicado en producción");
      return;
    }

    if (actionId === "retrain") {
      setRows((prev) => [
        {
          ...row,
          id: Date.now(),
          version: "v" + (2 + Math.random()).toFixed(1),
          estado: "Pruebas"
        },
        ...prev
      ]);
      showToast("Reentrenamiento simulado generado");
      return;
    }

    if (actionId === "toggle") {
      updateRow(row.id, {
        estado: row.estado === "Activo" ? "Inactivo" : "Activo"
      });
      showToast("Estado actualizado");
      return;
    }

    if (actionId === "reorder") {
      updateRow(row.id, { sugerencia: "Orden de reposición creada" });
      showToast("Reposición sugerida");
      return;
    }

    if (actionId === "generate") {
      updateRow(row.id, { estado: "Listo" });
      showToast("Reporte generado");
      return;
    }

    if (actionId === "download") {
      downloadCsv("consultation-forecast-view.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="consultation-forecast-view-page">
      <section className="consultation-forecast-view-hero">
        <div>
          <span className="consultation-forecast-view-eyebrow">
            Usuario consulta
          </span>

          <h2>Bienvenid@ 🤗</h2>

          <p>
            Puedes revisar la demanda proyectada por producto y región para anticipar
            compras, priorizar reposición y detectar oportunidades comerciales.
          </p>
        </div>

        <div className="consultation-forecast-view-hero-actions">
          <button onClick={loadRows}>
            {loading ? "Actualizando..." : "Actualizar datos"}
          </button>

          <button
            onClick={() =>
              downloadCsv("consultation-forecast-view.csv", filteredRows)
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="consultation-forecast-source-card">
        <div>
          <span>Modelo productivo</span>
          <h3>
            {modelInfo?.version
              ? `Modelo ${modelInfo.version}`
              : topForecast?.modeloVersion
                ? `Modelo ${topForecast.modeloVersion}`
                : "Modelo de predicción publicado"}
          </h3>
          <p>
            Predicciones generadas por el modelo activo para estimar demanda,
            nivel de confianza y probabilidad de compra por región.
          </p>
        </div>

        <div className="consultation-forecast-source-status">
          <article>
            <strong>{modelInfo?.algoritmo ?? "Forecast ML"}</strong>
            <span>algoritmo</span>
          </article>

          <article>
            <strong>{modelInfo?.precision ?? formatPercent(averageConfidence)}</strong>
            <span>precisión / confianza</span>
          </article>

          <article>
            <strong>{modelInfo?.estado ?? "Publicado"}</strong>
            <span>estado</span>
          </article>
        </div>
      </section>

      <section className="consultation-forecast-kpis">
        <article>
          <span>📦</span>
          <strong>{formatNumber(totalDemand)}</strong>
          <p>demanda proyectada</p>
        </article>

        <article>
          <span>🎯</span>
          <strong>{formatPercent(averageConfidence)}</strong>
          <p>confianza promedio</p>
        </article>

        <article>
          <span>🔥</span>
          <strong>{highProbabilityCount}</strong>
          <p>productos con probabilidad alta</p>
        </article>

        <article>
          <span>⭐</span>
          <strong>{topForecast?.producto ?? "Sin datos"}</strong>
          <p>mayor oportunidad</p>
        </article>
      </section>

      <section className="consultation-forecast-view-toolbar">
        <label className="consultation-forecast-view-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por producto, región, periodo, tendencia..."
          />
        </label>

        {filterFields.map((field) => (
          <label key={field}>
            {fieldLabels[field] ?? field}
            <select
              value={filters[field]}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  [field]: event.target.value
                }))
              }
            >
              {optionsByFilter[field].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
      </section>

      <section className="consultation-forecast-view-summary">
        <article>
          <strong>{rows.length}</strong>
          <span>registros totales</span>
        </article>

        <article>
          <strong>{filteredRows.length}</strong>
          <span>resultado filtrado</span>
        </article>

        <article>
          <strong>{filterFields.length}</strong>
          <span>filtros activos</span>
        </article>
      </section>

      <section className="consultation-forecast-analytics-grid">
        <article className="consultation-forecast-chart-card">
          <div className="consultation-forecast-chart-head">
            <span>Demanda</span>
            <h3>Productos con mayor proyección</h3>
          </div>

          <div className="consultation-forecast-bars">
            {demandRanking.map((row) => (
              <div className="consultation-forecast-bar" key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <small>
                    {formatNumber(row.value)} uds · {row.region}
                  </small>
                </div>

                <span>
                  <i style={{ width: `${row.percent}%` }} />
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="consultation-forecast-donut-card">
          <div className="consultation-forecast-chart-head">
            <span>Probabilidad</span>
            <h3>Distribución de oportunidades</h3>
          </div>

          <div className="consultation-forecast-donut-wrap">
            <div
              className="consultation-forecast-donut"
              style={{ background: probabilityStats.gradient }}
            >
              <div>
                <strong>{rows.length}</strong>
                <span>predicciones</span>
              </div>
            </div>

            <div className="consultation-forecast-donut-legend">
              <article>
                <span className="alta" />
                <p>
                  Alta <strong>{probabilityStats.alta}</strong>
                </p>
              </article>

              <article>
                <span className="media" />
                <p>
                  Media <strong>{probabilityStats.media}</strong>
                </p>
              </article>

              <article>
                <span className="baja" />
                <p>
                  Baja <strong>{probabilityStats.baja}</strong>
                </p>
              </article>
            </div>
          </div>
        </article>

        <article className="consultation-forecast-chart-card">
          <div className="consultation-forecast-chart-head">
            <span>Confianza</span>
            <h3>Nivel de certeza por producto</h3>
          </div>

          <div className="consultation-forecast-confidence-list">
            {confidenceRanking.map((row) => (
              <div className="consultation-forecast-confidence" key={row.label}>
                <div className="consultation-forecast-ring">
                  <span style={{ "--value": `${row.percent}%` }}>
                    {row.value}%
                  </span>
                </div>

                <div>
                  <strong>{row.label}</strong>
                  <small>confianza estimada</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="consultation-forecast-view-table-card">
        <div className="consultation-forecast-view-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Forecasting publicado</h3>
          </div>

          <small>{loading ? "Cargando..." : `${filteredRows.length} resultados`}</small>
        </div>

        <div className="consultation-forecast-view-table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}

                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {[
                        "estado",
                        "prioridad",
                        "riesgo",
                        "rotacion",
                        "severidad",
                        "probabilidad",
                        "concentracion",
                        "escenario",
                        "tendencia"
                      ].includes(column.key) ? (
                        <span
                          className={`consultation-forecast-view-badge ${badgeClass(
                            row[column.key]
                          )}`}
                        >
                          {column.key === "tendencia"
                            ? `${trendIcon(row[column.key])} ${row[column.key]}`
                            : row[column.key]}
                        </span>
                      ) : (
                        row[column.key]
                      )}
                    </td>
                  ))}

                  <td>
                    <div className="consultation-forecast-view-row-actions">
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => runAction(action.id, row)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="consultation-forecast-view-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="consultation-forecast-view-empty"
                  >
                    Cargando predicciones publicadas desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="consultation-forecast-view-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="consultation-forecast-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-forecast-view-modal consultation-forecast-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="consultation-forecast-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-forecast-view-eyebrow">
              Detalle de predicción
            </span>

            <h3>{modal.row.producto}</h3>

            <p className="consultation-forecast-detail-subtitle">
              {modal.row.region} · {modal.row.periodo} · Probabilidad{" "}
              {modal.row.probabilidad}
            </p>

            <div className="consultation-forecast-view-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}

              <article>
                <span>Modelo</span>
                <strong>{modal.row.modeloVersion ?? modelInfo?.version ?? "v2.4"}</strong>
              </article>

              <article>
                <span>Estado</span>
                <strong>{modal.row.estado ?? "Publicado"}</strong>
              </article>
            </div>

            <div className="consultation-forecast-insight">
              <strong>Análisis rápido</strong>
              <p>
                Se proyecta una demanda de{" "}
                <strong>{modal.row.demanda}</strong> para{" "}
                <strong>{modal.row.producto}</strong> en{" "}
                <strong>{modal.row.region}</strong>, con confianza de{" "}
                <strong>{modal.row.confianza}</strong> y tendencia{" "}
                <strong>{modal.row.tendencia}</strong>. Esta información ayuda
                a planificar compras y priorizar reposición.
              </p>
            </div>

            <div className="consultation-forecast-view-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="consultation-forecast-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="consultation-forecast-view-modal consultation-forecast-view-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="consultation-forecast-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-forecast-view-eyebrow">
              Formulario
            </span>

            <h3>{modal.title}</h3>

            <div className="consultation-forecast-view-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}
                  <input
                    value={form[field] ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [field]: event.target.value
                      }))
                    }
                    placeholder={fieldLabels[field] ?? field}
                  />
                </label>
              ))}
            </div>

            <div className="consultation-forecast-view-modal-actions">
              <button type="button" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}