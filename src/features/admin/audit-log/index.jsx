import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const columns = [
  {
    key: "fecha",
    label: "Fecha"
  },
  {
    key: "usuario",
    label: "Usuario"
  },
  {
    key: "accion",
    label: "Acción"
  },
  {
    key: "modulo",
    label: "Módulo"
  },
  {
    key: "riesgo",
    label: "Riesgo"
  }
];

const filterFields = ["usuario", "modulo", "riesgo"];

const actions = [
  {
    id: "view",
    label: "Ver detalle"
  }
];

const formFields = ["usuario", "accion", "modulo", "riesgo"];

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
    text.includes("bajo") ||
    text.includes("activo") ||
    text.includes("aprob") ||
    text.includes("listo") ||
    text.includes("produccion") ||
    text.includes("producción") ||
    text.includes("validado") ||
    text.includes("operativa") ||
    text.includes("rentable") ||
    text.includes("normal")
  ) {
    return "success";
  }

  if (
    text.includes("medio") ||
    text.includes("media") ||
    text.includes("pend") ||
    text.includes("revision") ||
    text.includes("revisión") ||
    text.includes("observ") ||
    text.includes("pruebas") ||
    text.includes("generacion") ||
    text.includes("generación")
  ) {
    return "warning";
  }

  if (
    text.includes("alto") ||
    text.includes("alta") ||
    text.includes("rechaz") ||
    text.includes("critico") ||
    text.includes("crítico") ||
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
    fecha: new Date().toISOString().slice(0, 16).replace("T", " "),
    usuario: "",
    accion: "",
    modulo: "",
    riesgo: "Bajo"
  };
}

export default function AdminAuditLogPage() {
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
      .from("admin_audit_log")
      .select("id, fecha, usuario, accion, modulo, riesgo, created_at")
      .order("id", { ascending: false });

    console.log("BITACORA DATA:", data);
    console.log("BITACORA ERROR:", error);

    if (error) {
      console.error("Error cargando bitácora:", error);
      showToast("No se pudo cargar la bitácora");
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
          `${row.fecha ?? ""} ${row.usuario ?? ""} ${row.accion ?? ""} ${row.modulo ?? ""} ${row.riesgo ?? ""}`
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
    setModal({ type: "form", title: "Nuevo registro", mode: "create" });
  }

  function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar registro", mode: "edit" });
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = {
      fecha: form.fecha || new Date().toISOString().slice(0, 16).replace("T", " "),
      usuario: form.usuario,
      accion: form.accion,
      modulo: form.modulo,
      riesgo: form.riesgo
    };

    if (
      !payload.fecha ||
      !payload.usuario ||
      !payload.accion ||
      !payload.modulo ||
      !payload.riesgo
    ) {
      showToast("Completa todos los campos");
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .insert([payload])
        .select("id, fecha, usuario, accion, modulo, riesgo, created_at")
        .single();

      if (error) {
        console.error("Error creando registro de auditoría:", error);
        showToast("No se pudo crear el registro");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Registro creado correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .update(payload)
        .eq("id", form.id)
        .select("id, fecha, usuario, accion, modulo, riesgo, created_at")
        .single();

      if (error) {
        console.error("Error editando registro de auditoría:", error);
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
      .from("admin_audit_log")
      .update(updates)
      .eq("id", id)
      .select("id, fecha, usuario, accion, modulo, riesgo, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error actualizando auditoría:", error);
      showToast("No se pudo actualizar el registro");
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
        `¿Seguro que deseas eliminar este registro de auditoría?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_audit_log")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando auditoría:", error);
        showToast("No se pudo eliminar el registro");
        return;
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Registro eliminado");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-audit-log.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-audit-log-page">
      <section className="admin-audit-log-hero">
        <div>
          <span className="admin-audit-log-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗</h2>
          <p> Aquí podrá ver su historial de accesos y cambios.</p>
        </div>

        <div className="admin-audit-log-hero-actions">
          <button onClick={() => downloadCsv("admin-audit-log.csv", filteredRows)}>
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-audit-log-toolbar">
        <label className="admin-audit-log-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por fecha, usuario, acción, módulo o riesgo..."
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

      <section className="admin-audit-log-summary">
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

      <section className="admin-audit-log-table-card">
        <div className="admin-audit-log-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Bitácora y auditoría</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="admin-audit-log-table-wrap">
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
                          className={`admin-audit-log-badge ${badgeClass(
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
                    <div className="admin-audit-log-row-actions">
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
                    className="admin-audit-log-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-audit-log-empty"
                  >
                    Cargando bitácora desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-audit-log-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-audit-log-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-audit-log-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-audit-log-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-audit-log-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-audit-log-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-audit-log-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-audit-log-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-audit-log-modal admin-audit-log-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-audit-log-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-audit-log-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-audit-log-form-grid">
              <label>
                Fecha
                <input
                  value={form.fecha ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fecha: event.target.value }))
                  }
                  placeholder="YYYY-MM-DD HH:mm"
                />
              </label>

              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "riesgo" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Bajo</option>
                      <option>Medio</option>
                      <option>Alto</option>
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

            <div className="admin-audit-log-modal-actions">
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