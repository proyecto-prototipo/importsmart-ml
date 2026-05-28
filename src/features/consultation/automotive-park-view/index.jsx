import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const initialRows = [
  {
    id: 1,
    region: "Lima",
    marca: "Toyota",
    modelo: "Hilux",
    tipo: "Pick-up",
    unidades: "18,420",
    crecimiento: "12.5%",
    antiguedad: "6 años",
    concentracion: "Alta",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    id: 2,
    region: "Arequipa",
    marca: "Hyundai",
    modelo: "Accent",
    tipo: "Sedán",
    unidades: "9,860",
    crecimiento: "8.1%",
    antiguedad: "7 años",
    concentracion: "Media",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    id: 3,
    region: "La Libertad",
    marca: "Nissan",
    modelo: "NP300",
    tipo: "Pick-up",
    unidades: "7,420",
    crecimiento: "10.2%",
    antiguedad: "5 años",
    concentracion: "Alta",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    id: 4,
    region: "Piura",
    marca: "Chevrolet",
    modelo: "Spark",
    tipo: "Hatchback",
    unidades: "5,120",
    crecimiento: "3.4%",
    antiguedad: "8 años",
    concentracion: "Media",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    id: 5,
    region: "Lambayeque",
    marca: "Toyota",
    modelo: "Corolla",
    tipo: "Sedán",
    unidades: "4,980",
    crecimiento: "6.7%",
    antiguedad: "6 años",
    concentracion: "Media",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  }
];

const columns = [
  {
    key: "region",
    label: "Región"
  },
  {
    key: "marca",
    label: "Marca"
  },
  {
    key: "modelo",
    label: "Modelo"
  },
  {
    key: "tipo",
    label: "Tipo"
  },
  {
    key: "unidades",
    label: "Unidades"
  },
  {
    key: "crecimiento",
    label: "Crecimiento"
  },
  {
    key: "antiguedad",
    label: "Antigüedad"
  },
  {
    key: "concentracion",
    label: "Concentración"
  },
  {
    key: "fuente",
    label: "Fuente"
  }
];

const filterFields = ["region", "marca", "tipo"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "download", label: "Descargar" }
];

const formFields = [
  "region",
  "marca",
  "modelo",
  "tipo",
  "unidades",
  "crecimiento",
  "concentracion"
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

function deriveConcentration(cantidad) {
  const units = parseNumber(cantidad);

  if (units >= 10000) return "Alta";
  if (units >= 5000) return "Media";
  return "Baja";
}

function mapFleetRow(row) {
  return {
    id: row.id,
    region: row.region ?? "",
    marca: row.marca ?? "",
    modelo: row.modelo ?? "",
    tipo: row.tipoVehiculo ?? row.tipo ?? "",
    unidades: row.cantidad ?? row.unidades ?? "0",
    crecimiento: row.crecimiento ?? "0%",
    antiguedad: row.antiguedadPromedio ?? row.antiguedad ?? "",
    concentracion:
      row.concentracion ?? deriveConcentration(row.cantidad ?? row.unidades),
    fuente: row.fuente ?? "SUNARP",
    ultimaActualizacion: row.ultimaActualizacion ?? "",
    estado: row.estado ?? "Validado",
    raw: row
  };
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

export default function ConsultationAutomotiveParkViewPage() {
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

    const [fleetResult, sourceResult] = await Promise.all([
      supabase
        .from("admin_vehicle_fleet")
        .select("*")
        .order("id", { ascending: true }),

      supabase
        .from("admin_data_integration")
        .select("*")
        .ilike("fuente", "%SUNARP%")
        .order("id", { ascending: true })
        .limit(1)
    ]);

    if (fleetResult.error) {
      console.error("Error cargando parque automotor:", fleetResult.error);
      showToast("No se pudo cargar parque automotor desde Supabase");
      setRows(initialRows);
      setLoading(false);
      return;
    }

    if (sourceResult.error) {
      console.error("Error cargando fuente SUNARP:", sourceResult.error);
      setSourceInfo(null);
    } else {
      setSourceInfo(sourceResult.data?.[0] ?? null);
    }

    const mappedRows = (fleetResult.data ?? []).map(mapFleetRow);

    setRows(mappedRows.length > 0 ? mappedRows : initialRows);
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
          `${row.region ?? ""} ${row.marca ?? ""} ${row.modelo ?? ""} ${row.tipo ?? ""} ${row.unidades ?? ""} ${row.crecimiento ?? ""} ${row.antiguedad ?? ""} ${row.concentracion ?? ""} ${row.fuente ?? ""} ${row.estado ?? ""}`
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

  const totalBrands = useMemo(() => {
    return new Set(rows.map((row) => row.marca).filter(Boolean)).size;
  }, [rows]);

  const totalRegions = useMemo(() => {
    return new Set(rows.map((row) => row.region).filter(Boolean)).size;
  }, [rows]);

  const topRegion = useMemo(() => {
    const totals = {};

    rows.forEach((row) => {
      totals[row.region] = (totals[row.region] ?? 0) + parseNumber(row.unidades);
    });

    return (
      Object.entries(totals).sort((a, b) => b[1] - a[1])[0] ?? [
        "Sin región",
        0
      ]
    );
  }, [rows]);

  const brandRanking = useMemo(() => {
    const totals = {};

    rows.forEach((row) => {
      totals[row.marca] = (totals[row.marca] ?? 0) + parseNumber(row.unidades);
    });

    const max = Math.max(...Object.values(totals), 1);

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({
        label,
        value,
        percent: Math.round((value / max) * 100)
      }));
  }, [rows]);

  const regionRanking = useMemo(() => {
    const totals = {};

    rows.forEach((row) => {
      totals[row.region] = (totals[row.region] ?? 0) + parseNumber(row.unidades);
    });

    const max = Math.max(...Object.values(totals), 1);

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({
        label,
        value,
        percent: Math.round((value / max) * 100)
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
      downloadCsv("consultation-automotive-park-view.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="consultation-automotive-park-view-page">
      <section className="consultation-automotive-park-view-hero">
        <div>
          <span className="consultation-automotive-park-view-eyebrow">
            Usuario consulta
          </span>
          <h2>Bienvenid@ 🤗</h2>
          <p>
            Aquí podrás consultar marcas, modelos, regiones, crecimiento y concentración
            vehicular. Los datos se cargan desde la fuente SUNARP sincronizada
            por el módulo de Integración de datos del administrador.
          </p>
        </div>

        <div className="consultation-automotive-park-view-hero-actions">
          <button onClick={loadRows}>
            {loading ? "Actualizando..." : "Actualizar datos"}
          </button>

          <button
            onClick={() =>
              downloadCsv("consultation-automotive-park-view.csv", filteredRows)
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="consultation-automotive-source-card">
        <div>
          <span>Fuente vinculada</span>
          <h3>{sourceInfo?.fuente ?? "SUNARP parque automotor"}</h3>
          <p>
            Información actualizada del parque automotor por región, marca y modelo,
            basada en datos cargados desde la fuente SUNARP para apoyar la consulta de
            demanda y compatibilidad de repuestos.
          </p>
        </div>

        <div className="consultation-source-status">
          <article>
            <strong>{sourceInfo?.registros ?? formatNumber(totalUnits)}</strong>
            <span>registros fuente</span>
          </article>

          <article>
            <strong>{sourceInfo?.estado ?? "Validado"}</strong>
            <span>estado SUNARP</span>
          </article>

          <article>
            <strong>{formatDate(sourceInfo?.fecha)}</strong>
            <span>última carga</span>
          </article>
        </div>
      </section>

      <section className="consultation-automotive-kpis">
        <article>
          <span>🚗</span>
          <strong>{formatNumber(totalUnits)}</strong>
          <p>vehículos analizados</p>
        </article>

        <article>
          <span>🏷️</span>
          <strong>{totalBrands}</strong>
          <p>marcas principales</p>
        </article>

        <article>
          <span>📍</span>
          <strong>{totalRegions}</strong>
          <p>regiones evaluadas</p>
        </article>

        <article>
          <span>📈</span>
          <strong>{topRegion[0]}</strong>
          <p>mayor concentración</p>
        </article>
      </section>

      <section className="consultation-automotive-park-view-toolbar">
        <label className="consultation-automotive-park-view-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por región, marca, modelo, tipo o fuente..."
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

      <section className="consultation-automotive-park-view-summary">
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

      <section className="consultation-automotive-charts">
        <article>
          <div className="consultation-chart-head">
            <span>Ranking</span>
            <h3>Vehículos por marca</h3>
          </div>

          <div className="consultation-chart-bars">
            {brandRanking.map((row) => (
              <div key={row.label} className="consultation-chart-bar">
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
          <div className="consultation-chart-head">
            <span>Regiones</span>
            <h3>Concentración vehicular</h3>
          </div>

          <div className="consultation-chart-bars">
            {regionRanking.map((row) => (
              <div key={row.label} className="consultation-chart-bar">
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
      </section>

      <section className="consultation-automotive-park-view-table-card">
        <div className="consultation-automotive-park-view-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Parque automotor</h3>
          </div>

          <small>{loading ? "Cargando..." : `${filteredRows.length} resultados`}</small>
        </div>

        <div className="consultation-automotive-park-view-table-wrap">
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
                          className={`consultation-automotive-park-view-badge ${badgeClass(
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
                    <div className="consultation-automotive-park-view-row-actions">
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
                    className="consultation-automotive-park-view-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="consultation-automotive-park-view-empty"
                  >
                    Cargando parque automotor desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="consultation-automotive-park-view-toast">{toast}</div>
      )}

      {modal?.type === "detail" && (
        <div
          className="consultation-automotive-park-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-automotive-park-view-modal consultation-automotive-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="consultation-automotive-park-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-automotive-park-view-eyebrow">
              Detalle SUNARP
            </span>

            <h3>
              {modal.row.marca} {modal.row.modelo}
            </h3>

            <p className="consultation-detail-subtitle">
              {modal.row.region} · {modal.row.tipo} · Fuente{" "}
              {modal.row.fuente}
            </p>

            <div className="consultation-automotive-park-view-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}

              <article>
                <span>Estado</span>
                <strong>{modal.row.estado}</strong>
              </article>

              <article>
                <span>Última actualización</span>
                <strong>{formatDate(modal.row.ultimaActualizacion)}</strong>
              </article>
            </div>

            <div className="consultation-detail-insight">
              <strong>Análisis rápido</strong>
              <p>
                {modal.row.marca} {modal.row.modelo} presenta una concentración{" "}
                <strong>{modal.row.concentracion}</strong> en{" "}
                <strong>{modal.row.region}</strong>. Esta información puede
                usarse para estimar demanda de repuestos compatibles en el
                catálogo.
              </p>
            </div>

            <div className="consultation-automotive-park-view-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="consultation-automotive-park-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="consultation-automotive-park-view-modal consultation-automotive-park-view-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="consultation-automotive-park-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-automotive-park-view-eyebrow">
              Formulario
            </span>

            <h3>{modal.title}</h3>

            <div className="consultation-automotive-park-view-form-grid">
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

            <div className="consultation-automotive-park-view-modal-actions">
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