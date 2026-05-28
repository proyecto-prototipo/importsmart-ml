import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

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
    key: "responsable",
    label: "Responsable"
  }
];

const filterFields = ["tipo", "estado", "periodo"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "edit", label: "Editar" },
  { id: "download", label: "Descargar" },
  { id: "generate", label: "Regenerar" }
];

const formFields = ["reporte", "tipo", "periodo", "estado", "responsable"];

const fieldLabels = Object.fromEntries(
  columns.map((column) => [column.key, column.label])
);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    text.includes("generacion") ||
    text.includes("generación")
  ) {
    return "warning";
  }

  if (
    text.includes("rechaz") ||
    text.includes("critico") ||
    text.includes("crítico") ||
    (text.includes("alta") && text.includes("riesgo")) ||
    text.includes("alto") ||
    text.includes("no leido") ||
    text.includes("no leído") ||
    text.includes("sobrestock") ||
    text.includes("error")
  ) {
    return "danger";
  }

  return "neutral";
}

function createBlankRow() {
  return {
    id: null,
    reporte: "",
    tipo: "Gerencial",
    periodo: "Mayo 2026",
    estado: "Pendiente",
    responsable: "Sistema"
  };
}

export default function AdminReportsPage() {
  const [rows, setRows] = useState([]);
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

    const { data, error } = await supabase
      .from("admin_reports")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando reportes:", error);
      showToast("No se pudieron cargar los reportes");
      setLoading(false);
      return;
    }

    setRows(data ?? []);
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
          `${row.reporte ?? ""} ${row.tipo ?? ""} ${row.periodo ?? ""} ${row.estado ?? ""} ${row.responsable ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function openCreate() {
    setForm(createBlankRow());
    setModal({ type: "form", title: "Generar reporte", mode: "create" });
  }

  function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar reporte", mode: "edit" });
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = {
      reporte: form.reporte,
      tipo: form.tipo,
      periodo: form.periodo,
      estado: form.estado,
      responsable: form.responsable
    };

    if (
      !payload.reporte ||
      !payload.tipo ||
      !payload.periodo ||
      !payload.estado ||
      !payload.responsable
    ) {
      showToast("Completa todos los campos");
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_reports")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error creando reporte:", error);
        showToast("No se pudo crear el reporte");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Reporte registrado correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_reports")
        .update(payload)
        .eq("id", form.id)
        .select()
        .single();

      if (error) {
        console.error("Error editando reporte:", error);
        showToast("No se pudieron guardar los cambios");
        return;
      }

      setRows((prev) =>
        prev.map((row) => (row.id === form.id ? data : row))
      );

      showToast("Cambios guardados correctamente");
    }

    setModal(null);
  }

  async function updateRow(id, updates) {
    const { data, error } = await supabase
      .from("admin_reports")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando reporte:", error);
      showToast("No se pudo actualizar el reporte");
      return;
    }

    setRows((prev) => prev.map((row) => (row.id === id ? data : row)));
  }

  async function runAction(actionId, row) {
    if (actionId === "view") {
      setModal({ type: "detail", row });
      return;
    }

    if (actionId === "edit") {
      openEdit(row);
      return;
    }

    if (actionId === "delete") {
      const confirmDelete = window.confirm(
        `¿Seguro que deseas eliminar el reporte "${row.reporte}"?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_reports")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando reporte:", error);
        showToast("No se pudo eliminar el reporte");
        return;
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Reporte eliminado");
      return;
    }

    if (actionId === "generate") {
      await updateRow(row.id, {
        estado: "Listo"
      });

      showToast("Reporte generado correctamente");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-reports.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-reports-page">
      <section className="admin-reports-hero">
        <div>
          <span className="admin-reports-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗 </h2>
          <p>Aquí podrá realizar reportes básicos y gerenciales.</p>
        </div>

        <div className="admin-reports-hero-actions">
          <button onClick={openCreate}>Generar reporte</button>
          <button onClick={() => downloadCsv("admin-reports.csv", filteredRows)}>
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-reports-toolbar">
        <label className="admin-reports-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por reporte, tipo, periodo, estado o responsable..."
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

      <section className="admin-reports-summary">
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

      <section className="admin-reports-table-card">
        <div className="admin-reports-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Reportes generales</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="admin-reports-table-wrap">
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
                          className={`admin-reports-badge ${badgeClass(
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
                    <div className="admin-reports-row-actions">
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
                    className="admin-reports-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-reports-empty"
                  >
                    Cargando reportes desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-reports-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-reports-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-reports-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-reports-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-reports-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-reports-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-reports-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-reports-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-reports-modal admin-reports-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-reports-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-reports-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-reports-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "tipo" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Gerencial</option>
                      <option>Analítico</option>
                      <option>Operativo</option>
                    </select>
                  ) : field === "estado" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Pendiente</option>
                      <option>En generación</option>
                      <option>Listo</option>
                      <option>Error</option>
                    </select>
                  ) : field === "responsable" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Sistema</option>
                      <option>Analista</option>
                      <option>Gerencia</option>
                    </select>
                  ) : (
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
                  )}
                </label>
              ))}
            </div>

            <div className="admin-reports-modal-actions">
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