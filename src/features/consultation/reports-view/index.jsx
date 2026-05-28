import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const initialRows = [
  {
    id: 1,
    reporte: "Resumen de productos recomendados",
    tipo: "Comercial",
    periodo: "Mayo 2026",
    estado: "Listo",
    modulo_origen: "Recomendaciones publicadas",
    descripcion:
      "Reporte con productos sugeridos para evaluar compras según margen, riesgo, stock y capital estimado.",
    responsable: "Sistema",
    nivel_acceso: "Usuario consulta",
    fecha_publicacion: "2026-05-21",
    total_registros: "5 recomendaciones",
    formato: "CSV"
  },
  {
    id: 2,
    reporte: "Demanda proyectada por región",
    tipo: "Analítico",
    periodo: "Q2 2026",
    estado: "Listo",
    modulo_origen: "Forecasting publicado",
    descripcion:
      "Vista resumida de la demanda estimada por región y producto para los próximos periodos.",
    responsable: "Sistema",
    nivel_acceso: "Usuario consulta",
    fecha_publicacion: "2026-05-21",
    total_registros: "5 predicciones",
    formato: "CSV"
  },
  {
    id: 3,
    reporte: "Ventas históricas consultadas",
    tipo: "Histórico",
    periodo: "2026-Q1",
    estado: "Listo",
    modulo_origen: "Ventas históricas",
    descripcion:
      "Reporte básico de unidades vendidas, margen y rotación por producto y región.",
    responsable: "Analista",
    nivel_acceso: "Usuario consulta",
    fecha_publicacion: "2026-05-20",
    total_registros: "5 productos",
    formato: "CSV"
  }
];

const columns = [
  {
    key: "reporte",
    label: "Reporte"
  },
  {
    key: "tipo",
    label: "Tipo"
  },
  {
    key: "periodo",
    label: "Periodo"
  },
  {
    key: "estado",
    label: "Estado"
  },
  {
    key: "modulo_origen",
    label: "Módulo origen"
  },
  {
    key: "fecha_publicacion",
    label: "Publicación"
  }
];

const filterFields = ["tipo", "periodo", "estado"];
const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "download", label: "Descargar" }
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

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function downloadCsv(filename, rows) {
  const exportColumns = [
    { key: "reporte", label: "Reporte" },
    { key: "tipo", label: "Tipo" },
    { key: "periodo", label: "Periodo" },
    { key: "estado", label: "Estado" },
    { key: "modulo_origen", label: "Módulo origen" },
    { key: "descripcion", label: "Descripción" },
    { key: "responsable", label: "Responsable" },
    { key: "nivel_acceso", label: "Nivel de acceso" },
    { key: "fecha_publicacion", label: "Fecha de publicación" },
    { key: "total_registros", label: "Total registros" },
    { key: "formato", label: "Formato" }
  ];

  const headers = exportColumns.map((column) => column.label).join(",");

  const body = rows
    .map((row) =>
      exportColumns
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
    text.includes("listo") ||
    text.includes("publicado") ||
    text.includes("activo") ||
    text.includes("aprob") ||
    text.includes("validado") ||
    text.includes("operativa") ||
    text.includes("normal")
  ) {
    return "success";
  }

  if (
    text.includes("pend") ||
    text.includes("revision") ||
    text.includes("proceso") ||
    text.includes("generacion")
  ) {
    return "warning";
  }

  if (
    text.includes("rechaz") ||
    text.includes("critico") ||
    text.includes("error") ||
    text.includes("observ")
  ) {
    return "danger";
  }

  return "neutral";
}

export default function ConsultationReportsViewPage() {
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState(() =>
    Object.fromEntries(filterFields.map((field) => [field, "Todos"]))
  );

  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);

    const { data, error } = await supabase
      .from("consultation_reports_view")
      .select("*")
      .in("estado", ["Listo", "Publicado"])
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando reportes básicos:", error);
      showToast("No se pudieron cargar los reportes");
      setRows(initialRows);
      setLoading(false);
      return;
    }

    setRows((data ?? []).length > 0 ? data : initialRows);
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
          `${row.reporte ?? ""} ${row.tipo ?? ""} ${row.periodo ?? ""} ${
            row.estado ?? ""
          } ${row.modulo_origen ?? ""} ${row.descripcion ?? ""} ${
            row.responsable ?? ""
          } ${row.total_registros ?? ""} ${row.formato ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  const readyReports = useMemo(() => {
    return rows.filter((row) => normalize(row.estado).includes("listo")).length;
  }, [rows]);

  const analyticReports = useMemo(() => {
    return rows.filter((row) => normalize(row.tipo).includes("analitico"))
      .length;
  }, [rows]);

  const latestReport = useMemo(() => {
    return rows[0] ?? null;
  }, [rows]);

  const reportsByType = useMemo(() => {
    const total = Math.max(rows.length, 1);
    const types = [...new Set(rows.map((row) => row.tipo).filter(Boolean))];

    return types.map((type) => {
      const count = rows.filter((row) => row.tipo === type).length;

      return {
        tipo: type,
        count,
        percent: Math.round((count / total) * 100)
      };
    });
  }, [rows]);

  const reportsByModule = useMemo(() => {
    const modules = [
      ...new Set(rows.map((row) => row.modulo_origen).filter(Boolean))
    ];

    return modules.map((module) => {
      const count = rows.filter((row) => row.modulo_origen === module).length;

      return {
        module,
        count
      };
    });
  }, [rows]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function runAction(actionId, row) {
    if (actionId === "view") {
      setModal({ type: "detail", row });
      return;
    }

    if (actionId === "download") {
      downloadCsv(`reporte-${row.id}.csv`, [row]);
      showToast("Reporte descargado correctamente");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="consultation-reports-view-page">
      <section className="consultation-reports-view-hero">
        <div>
          <span className="consultation-reports-view-eyebrow">
            Usuario consulta
          </span>

          <h2>Bienvenid@ 🤗</h2>

          <p>
            Aquí podrás realizar consultas, reportes preparados para revisar productos recomendados,
            demanda proyectada, ventas históricas y oportunidades comerciales de
            forma rápida.
          </p>
        </div>

        <div className="consultation-reports-view-hero-actions">
          <button onClick={loadReports}>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>

          <button
            onClick={() =>
              downloadCsv("consultation-reports-view.csv", filteredRows)
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="consultation-reports-insight-card">
        <div>
          <span>Centro de reportes</span>

          <h3>Información lista para tomar decisiones</h3>

          <p>
            Aquí encontrarás reportes publicados para el usuario consulta,
            organizados por tipo, periodo y módulo de origen.
          </p>
        </div>

        <div className="consultation-reports-insight-main">
          <article>
            <span>Último reporte</span>
            <strong>{latestReport?.reporte ?? "Sin reportes"}</strong>
            <small>{latestReport?.periodo ?? "Sin periodo"}</small>
          </article>

          <article>
            <span>Reportes listos</span>
            <strong>{readyReports}</strong>
            <small>disponibles para consulta</small>
          </article>

          <article>
            <span>Analíticos</span>
            <strong>{analyticReports}</strong>
            <small>con información comparativa</small>
          </article>
        </div>
      </section>

      <section className="consultation-reports-analytics-grid">
        <article className="consultation-reports-chart-card">
          <div>
            <span>Tipos de reporte</span>
            <h3>Distribución disponible</h3>
          </div>

          <div className="consultation-reports-bars">
            {reportsByType.map((item) => (
              <div className="consultation-reports-bar" key={item.tipo}>
                <div>
                  <strong>{item.tipo}</strong>
                  <small>{item.count} reporte(s)</small>
                </div>

                <span>
                  <i style={{ width: `${item.percent}%` }} />
                </span>
              </div>
            ))}

            {reportsByType.length === 0 && (
              <div className="consultation-reports-empty-mini">
                No hay tipos de reportes disponibles.
              </div>
            )}
          </div>
        </article>

        <article className="consultation-reports-guide-card">
          <span>Módulos relacionados</span>

          <h3>Origen de la información</h3>

          <div>
            {reportsByModule.map((item) => (
              <article key={item.module}>
                <strong>{item.module}</strong>
                <p>{item.count} reporte(s) disponible(s) para consulta.</p>
              </article>
            ))}

            {reportsByModule.length === 0 && (
              <article>
                <strong>Sin módulos</strong>
                <p>Todavía no hay reportes cargados desde Supabase.</p>
              </article>
            )}
          </div>
        </article>
      </section>

      <section className="consultation-reports-view-toolbar">
        <label className="consultation-reports-view-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por reporte, módulo, periodo o estado..."
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

      <section className="consultation-reports-view-summary">
        <article>
          <strong>{rows.length}</strong>
          <span>reportes totales</span>
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

      <section className="consultation-reports-view-table-card">
        <div className="consultation-reports-view-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Reportes básicos</h3>
          </div>

          <small>{loading ? "Cargando..." : `${filteredRows.length} resultados`}</small>
        </div>

        <div className="consultation-reports-view-table-wrap">
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
                      {["estado"].includes(column.key) ? (
                        <span
                          className={`consultation-reports-view-badge ${badgeClass(
                            row[column.key]
                          )}`}
                        >
                          {row[column.key]}
                        </span>
                      ) : column.key === "fecha_publicacion" ? (
                        formatDate(row[column.key])
                      ) : (
                        row[column.key]
                      )}
                    </td>
                  ))}

                  <td>
                    <div className="consultation-reports-view-row-actions">
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
                    className="consultation-reports-view-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="consultation-reports-view-empty"
                  >
                    Cargando reportes desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="consultation-reports-view-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="consultation-reports-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-reports-view-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="consultation-reports-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-reports-view-eyebrow">Detalle</span>

            <h3>{modal.row.reporte}</h3>

            <p className="consultation-reports-modal-subtitle">
              {modal.row.tipo} · {modal.row.periodo} · {modal.row.estado}
            </p>

            <div className="consultation-reports-view-detail-grid">
              <article>
                <span>Tipo</span>
                <strong>{modal.row.tipo}</strong>
              </article>

              <article>
                <span>Periodo</span>
                <strong>{modal.row.periodo}</strong>
              </article>

              <article>
                <span>Estado</span>
                <strong>{modal.row.estado}</strong>
              </article>

              <article>
                <span>Módulo origen</span>
                <strong>{modal.row.modulo_origen ?? "No especificado"}</strong>
              </article>

              <article>
                <span>Responsable</span>
                <strong>{modal.row.responsable ?? "Sistema"}</strong>
              </article>

              <article>
                <span>Publicación</span>
                <strong>{formatDate(modal.row.fecha_publicacion)}</strong>
              </article>

              <article>
                <span>Total registros</span>
                <strong>{modal.row.total_registros ?? "No especificado"}</strong>
              </article>

              <article>
                <span>Formato</span>
                <strong>{modal.row.formato ?? "CSV"}</strong>
              </article>
            </div>

            <div className="consultation-reports-detail-note">
              <strong>Descripción</strong>
              <p>
                {modal.row.descripcion ??
                  "Reporte disponible para consulta y descarga según permisos del usuario."}
              </p>
            </div>

            <div className="consultation-reports-view-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>

              <button onClick={() => runAction("download", modal.row)}>
                Descargar reporte
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}