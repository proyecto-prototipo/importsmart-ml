import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const columns = [
  {
    key: "tipo",
    label: "Tipo"
  },
  {
    key: "detalle",
    label: "Detalle"
  },
  {
    key: "prioridad",
    label: "Prioridad"
  },
  {
    key: "canal",
    label: "Canal"
  },
  {
    key: "estado",
    label: "Estado"
  }
];

const filterFields = ["tipo", "prioridad", "estado"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "edit", label: "Editar" },
  { id: "read", label: "Marcar leído" }
];

const formFields = ["tipo", "detalle", "prioridad", "canal", "estado"];

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
    text.includes("activo") ||
    text.includes("aprob") ||
    text.includes("listo") ||
    text.includes("produccion") ||
    text.includes("validado") ||
    text.includes("operativa") ||
    text.includes("rentable") ||
    text.includes("bajo") ||
    text.includes("normal") ||
    text.includes("leido") ||
    text.includes("leído")
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
    text.includes("crítico") ||
    text.includes("alta") ||
    text.includes("alto") ||
    text.includes("no leido") ||
    text.includes("no leído") ||
    text.includes("sobrestock")
  ) {
    return "danger";
  }

  return "neutral";
}

function createBlankRow() {
  return {
    id: null,
    tipo: "",
    detalle: "",
    prioridad: "Media",
    canal: "Sistema",
    estado: "No leído"
  };
}

export default function AdminAlertsPage() {
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
      .from("admin_alerts")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando alertas:", error);
      showToast("No se pudieron cargar las alertas");
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
          `${row.tipo ?? ""} ${row.detalle ?? ""} ${row.prioridad ?? ""} ${row.canal ?? ""} ${row.estado ?? ""}`
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
    setModal({ type: "form", title: "Nueva alerta", mode: "create" });
  }

  function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar alerta", mode: "edit" });
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = {
      tipo: form.tipo,
      detalle: form.detalle,
      prioridad: form.prioridad,
      canal: form.canal,
      estado: form.estado
    };

    if (
      !payload.tipo ||
      !payload.detalle ||
      !payload.prioridad ||
      !payload.canal ||
      !payload.estado
    ) {
      showToast("Completa todos los campos");
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_alerts")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error creando alerta:", error);
        showToast("No se pudo crear la alerta");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Alerta creada correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_alerts")
        .update(payload)
        .eq("id", form.id)
        .select()
        .single();

      if (error) {
        console.error("Error editando alerta:", error);
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
      .from("admin_alerts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando alerta:", error);
      showToast("No se pudo actualizar la alerta");
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
        `¿Seguro que deseas eliminar la alerta "${row.tipo}"?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_alerts")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando alerta:", error);
        showToast("No se pudo eliminar la alerta");
        return;
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Alerta eliminada");
      return;
    }

    if (actionId === "read") {
      await updateRow(row.id, {
        estado: "Leído"
      });

      showToast("Alerta marcada como leída");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-alerts.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-alerts-page">
      <section className="admin-alerts-hero">
        <div>
          <span className="admin-alerts-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗 </h2>
          <p>
            Aquí podrá realizar la configuración y seguimiento de avisos. 
          </p>
        </div>

        <div className="admin-alerts-hero-actions">
          <button onClick={openCreate}>Nueva alerta</button>
          <button onClick={() => downloadCsv("admin-alerts.csv", filteredRows)}>
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-alerts-toolbar">
        <label className="admin-alerts-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por tipo, detalle, prioridad, canal o estado..."
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

      <section className="admin-alerts-summary">
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

      <section className="admin-alerts-table-card">
        <div className="admin-alerts-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Alertas y notificaciones</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="admin-alerts-table-wrap">
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
                          className={`admin-alerts-badge ${badgeClass(
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
                    <div className="admin-alerts-row-actions">
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
                    className="admin-alerts-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-alerts-empty"
                  >
                    Cargando alertas desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-alerts-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-alerts-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-alerts-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-alerts-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-alerts-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-alerts-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-alerts-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-alerts-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-alerts-modal admin-alerts-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-alerts-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-alerts-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-alerts-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "prioridad" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Alta</option>
                      <option>Media</option>
                      <option>Baja</option>
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
                      <option>No leído</option>
                      <option>Leído</option>
                    </select>
                  ) : field === "canal" ? (
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
                      <option>Sistema + correo</option>
                      <option>Reporte</option>
                      <option>Correo</option>
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

            <div className="admin-alerts-modal-actions">
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