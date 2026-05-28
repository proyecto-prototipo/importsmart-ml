import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const initialRows = [
  {
    id: 1,
    producto: "Kit embrague Hilux",
    region: "Lima",
    periodo: "2026-Q1",
    unidades: "1,248",
    ticket: "S/ 425",
    margen: "34%",
    crecimiento: "18%",
    rotacion: "Alta",
    fuente: "Ventas históricas 2024-2026",
    estado: "Validado"
  },
  {
    id: 2,
    producto: "Pastillas freno Accent",
    region: "Arequipa",
    periodo: "2026-Q1",
    unidades: "2,804",
    ticket: "S/ 96",
    margen: "41%",
    crecimiento: "21%",
    rotacion: "Alta",
    fuente: "Ventas históricas 2024-2026",
    estado: "Validado"
  },
  {
    id: 3,
    producto: "Filtro aceite Corolla",
    region: "Lambayeque",
    periodo: "2026-Q1",
    unidades: "1,402",
    ticket: "S/ 32",
    margen: "29%",
    crecimiento: "7%",
    rotacion: "Media",
    fuente: "Ventas históricas 2024-2026",
    estado: "Validado"
  },
  {
    id: 4,
    producto: "Amortiguador NP300",
    region: "La Libertad",
    periodo: "2026-Q1",
    unidades: "892",
    ticket: "S/ 188",
    margen: "26%",
    crecimiento: "11%",
    rotacion: "Media",
    fuente: "Ventas históricas 2024-2026",
    estado: "Validado"
  },
  {
    id: 5,
    producto: "Bomba de agua Spark",
    region: "Piura",
    periodo: "2026-Q1",
    unidades: "244",
    ticket: "S/ 120",
    margen: "22%",
    crecimiento: "-4%",
    rotacion: "Baja",
    fuente: "Ventas históricas 2024-2026",
    estado: "Validado"
  }
];

const columns = [
  { key: "producto", label: "Producto" },
  { key: "region", label: "Región" },
  { key: "periodo", label: "Periodo" },
  { key: "unidades", label: "Unidades" },
  { key: "ticket", label: "Ticket" },
  { key: "margen", label: "Margen" },
  { key: "crecimiento", label: "Crecimiento" },
  { key: "rotacion", label: "Rotación" }
];

const filterFields = ["region", "rotacion", "periodo"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "download", label: "Descargar" }
];

const formFields = [
  "producto",
  "region",
  "periodo",
  "unidades",
  "ticket",
  "margen",
  "crecimiento",
  "rotacion"
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

  if (!Number.isFinite(number)) return "0%";

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
    text.includes("normal")
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
    text.includes("generacion")
  ) {
    return "warning";
  }

  if (
    text.includes("rechaz") ||
    text.includes("critico") ||
    (text.includes("alta") && text.includes("riesgo")) ||
    text.includes("alto") ||
    text.includes("no leido") ||
    text.includes("sobrestock")
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

export default function ConsultationSalesHistoryViewPage() {
  const [rows, setRows] = useState(initialRows);
  const [sourceInfo, setSourceInfo] = useState(null);
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

    const [salesResult, sourceResult] = await Promise.all([
      supabase
        .from("admin_sales_history")
        .select("*")
        .order("id", { ascending: true }),

      supabase
        .from("admin_data_integration")
        .select("*")
        .order("id", { ascending: true })
    ]);

    if (salesResult.error) {
      console.error("Error cargando ventas históricas:", salesResult.error);
      showToast("No se pudieron cargar las ventas históricas");
      setRows(initialRows);
      setLoading(false);
      return;
    }

    if (sourceResult.error) {
      console.error("Error cargando fuente de ventas:", sourceResult.error);
      setSourceInfo(null);
    } else {
      const source = (sourceResult.data ?? []).find((item) =>
        normalize(item.fuente).includes("ventas historicas")
      );

      setSourceInfo(source ?? null);
    }

    setRows((salesResult.data ?? []).length > 0 ? salesResult.data : initialRows);
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
          `${row.producto ?? ""} ${row.region ?? ""} ${row.periodo ?? ""} ${row.unidades ?? ""} ${row.ticket ?? ""} ${row.margen ?? ""} ${row.crecimiento ?? ""} ${row.rotacion ?? ""} ${row.fuente ?? ""} ${row.estado ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  const totalUnits = useMemo(() => {
    return rows.reduce((sum, row) => sum + parseNumber(row.unidades), 0);
  }, [rows]);

  const totalProducts = useMemo(() => {
    return new Set(rows.map((row) => row.producto).filter(Boolean)).size;
  }, [rows]);

  const averageMargin = useMemo(() => {
    if (rows.length === 0) return 0;

    const total = rows.reduce((sum, row) => sum + parseNumber(row.margen), 0);

    return total / rows.length;
  }, [rows]);

  const topProduct = useMemo(() => {
    return [...rows].sort(
      (a, b) => parseNumber(b.unidades) - parseNumber(a.unidades)
    )[0];
  }, [rows]);

  const productRanking = useMemo(() => {
    const max = Math.max(...rows.map((row) => parseNumber(row.unidades)), 1);

    return [...rows]
      .sort((a, b) => parseNumber(b.unidades) - parseNumber(a.unidades))
      .slice(0, 5)
      .map((row) => ({
        label: row.producto,
        value: parseNumber(row.unidades),
        percent: Math.round((parseNumber(row.unidades) / max) * 100)
      }));
  }, [rows]);

  const marginRanking = useMemo(() => {
    const max = Math.max(...rows.map((row) => parseNumber(row.margen)), 1);

    return [...rows]
      .sort((a, b) => parseNumber(b.margen) - parseNumber(a.margen))
      .slice(0, 5)
      .map((row) => ({
        label: row.producto,
        value: parseNumber(row.margen),
        percent: Math.round((parseNumber(row.margen) / max) * 100)
      }));
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
      downloadCsv("consultation-sales-history-view.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="consultation-sales-history-view-page">
      <section className="consultation-sales-history-view-hero">
        <div>
          <span className="consultation-sales-history-view-eyebrow">
            Usuario consulta
          </span>

          <h2>Bienvenid@ 🤗</h2>

          <p>
            Aquí podrás consultar el comportamiento histórico de ventas por producto, región
            y periodo para identificar rotación, margen y oportunidades de
            reposición.
          </p>
        </div>

        <div className="consultation-sales-history-view-hero-actions">
          <button onClick={loadRows}>
            {loading ? "Actualizando..." : "Actualizar datos"}
          </button>

          <button
            onClick={() =>
              downloadCsv("consultation-sales-history-view.csv", filteredRows)
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="consultation-sales-source-card">
        <div>
          <span>Fuente vinculada</span>
          <h3>{sourceInfo?.fuente ?? "Ventas históricas 2024-2026"}</h3>
          <p>
            Información consolidada de ventas para revisar productos con mayor
            movimiento, margen comercial y crecimiento por región.
          </p>
        </div>

        <div className="consultation-sales-source-status">
          <article>
            <strong>{sourceInfo?.registros ?? formatNumber(totalUnits)}</strong>
            <span>registros fuente</span>
          </article>

          <article>
            <strong>{sourceInfo?.estado ?? "Validado"}</strong>
            <span>estado de carga</span>
          </article>

          <article>
            <strong>{formatDate(sourceInfo?.fecha)}</strong>
            <span>última carga</span>
          </article>
        </div>
      </section>

      <section className="consultation-sales-kpis">
        <article>
          <span>📦</span>
          <strong>{formatNumber(totalUnits)}</strong>
          <p>unidades vendidas</p>
        </article>

        <article>
          <span>🧩</span>
          <strong>{totalProducts}</strong>
          <p>productos evaluados</p>
        </article>

        <article>
          <span>💰</span>
          <strong>{formatPercent(averageMargin)}</strong>
          <p>margen promedio</p>
        </article>

        <article>
          <span>⭐</span>
          <strong>{topProduct?.producto ?? "Sin datos"}</strong>
          <p>producto con mayor rotación</p>
        </article>
      </section>

      <section className="consultation-sales-history-view-toolbar">
        <label className="consultation-sales-history-view-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por producto, región, periodo o rotación..."
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

      <section className="consultation-sales-history-view-summary">
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

      <section className="consultation-sales-charts">
        <article>
          <div className="consultation-sales-chart-head">
            <span>Ranking</span>
            <h3>Productos con mayor venta</h3>
          </div>

          <div className="consultation-sales-chart-bars">
            {productRanking.map((row) => (
              <div className="consultation-sales-chart-bar" key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <small>{formatNumber(row.value)}</small>
                </div>

                <span>
                  <i style={{ width: `${row.percent}%` }} />
                </span>
              </div>
            ))}
          </div>
        </article>

        <article>
          <div className="consultation-sales-chart-head">
            <span>Margen</span>
            <h3>Productos con mejor margen</h3>
          </div>

          <div className="consultation-sales-chart-bars">
            {marginRanking.map((row) => (
              <div className="consultation-sales-chart-bar" key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <small>{row.value}%</small>
                </div>

                <span>
                  <i style={{ width: `${row.percent}%` }} />
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="consultation-sales-history-view-table-card">
        <div className="consultation-sales-history-view-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Ventas históricas</h3>
          </div>

          <small>{loading ? "Cargando..." : `${filteredRows.length} resultados`}</small>
        </div>

        <div className="consultation-sales-history-view-table-wrap">
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
                        "escenario"
                      ].includes(column.key) ? (
                        <span
                          className={`consultation-sales-history-view-badge ${badgeClass(
                            row[column.key]
                          )}`}
                        >
                          {row[column.key]}
                        </span>
                      ) : (
                        row[column.key]
                      )}
                    </td>
                  ))}

                  <td>
                    <div className="consultation-sales-history-view-row-actions">
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
                    className="consultation-sales-history-view-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="consultation-sales-history-view-empty"
                  >
                    Cargando ventas históricas desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="consultation-sales-history-view-toast">{toast}</div>
      )}

      {modal?.type === "detail" && (
        <div
          className="consultation-sales-history-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-sales-history-view-modal consultation-sales-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="consultation-sales-history-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-sales-history-view-eyebrow">
              Detalle de venta
            </span>

            <h3>{modal.row.producto}</h3>

            <p className="consultation-sales-detail-subtitle">
              {modal.row.region} · {modal.row.periodo} · Rotación{" "}
              {modal.row.rotacion}
            </p>

            <div className="consultation-sales-history-view-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}

              <article>
                <span>Fuente</span>
                <strong>{modal.row.fuente ?? "Ventas históricas"}</strong>
              </article>

              <article>
                <span>Estado</span>
                <strong>{modal.row.estado ?? "Validado"}</strong>
              </article>
            </div>

            <div className="consultation-sales-insight">
              <strong>Análisis rápido</strong>
              <p>
                Este producto presenta rotación{" "}
                <strong>{modal.row.rotacion}</strong> en{" "}
                <strong>{modal.row.region}</strong>, con un margen de{" "}
                <strong>{modal.row.margen}</strong> y crecimiento de{" "}
                <strong>{modal.row.crecimiento}</strong>. Esta información ayuda
                a identificar oportunidades de reposición y demanda.
              </p>
            </div>

            <div className="consultation-sales-history-view-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="consultation-sales-history-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="consultation-sales-history-view-modal consultation-sales-history-view-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="consultation-sales-history-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-sales-history-view-eyebrow">
              Formulario
            </span>

            <h3>{modal.title}</h3>

            <div className="consultation-sales-history-view-form-grid">
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

            <div className="consultation-sales-history-view-modal-actions">
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