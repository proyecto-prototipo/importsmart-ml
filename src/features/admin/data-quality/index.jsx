import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const columns = [
  {
    key: "fuente",
    label: "Fuente"
  },
  {
    key: "problema",
    label: "Problema"
  },
  {
    key: "severidad",
    label: "Severidad"
  },
  {
    key: "cantidad",
    label: "Cantidad"
  },
  {
    key: "estado",
    label: "Estado"
  },
  {
    key: "accion",
    label: "Acción"
  }
];

const filterFields = ["severidad", "estado"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "edit", label: "Editar" },
  { id: "clean", label: "Corregir" }
];

const formFields = [
  "fuente",
  "problema",
  "severidad",
  "cantidad",
  "estado",
  "accion"
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
    text.includes("baja") ||
    text.includes("normal") ||
    text.includes("corregido")
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
    text.includes("proceso")
  ) {
    return "warning";
  }

  if (
    text.includes("rechaz") ||
    text.includes("critico") ||
    text.includes("crítica") ||
    (text.includes("alta") && text.includes("riesgo")) ||
    text.includes("alto") ||
    text.includes("no leido") ||
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
    fuente: "",
    problema: "",
    severidad: "Media",
    cantidad: "0",
    estado: "Pendiente",
    accion: ""
  };
}

export default function AdminDataQualityPage() {
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
      .from("admin_data_quality")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando calidad de datos:", error);
      showToast("No se pudieron cargar las incidencias");
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
          `${row.fuente ?? ""} ${row.problema ?? ""} ${row.severidad ?? ""} ${row.cantidad ?? ""} ${row.estado ?? ""} ${row.accion ?? ""}`
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
    setModal({ type: "form", title: "Registrar incidencia", mode: "create" });
  }

  function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar registro", mode: "edit" });
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = {
      fuente: form.fuente,
      problema: form.problema,
      severidad: form.severidad,
      cantidad: form.cantidad,
      estado: form.estado,
      accion: form.accion
    };

    if (
      !payload.fuente ||
      !payload.problema ||
      !payload.severidad ||
      !payload.cantidad ||
      !payload.estado ||
      !payload.accion
    ) {
      showToast("Completa todos los campos");
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_data_quality")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error creando incidencia:", error);
        showToast("No se pudo registrar la incidencia");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Incidencia registrada correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_data_quality")
        .update(payload)
        .eq("id", form.id)
        .select()
        .single();

      if (error) {
        console.error("Error editando incidencia:", error);
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
      .from("admin_data_quality")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando incidencia:", error);
      showToast("No se pudo actualizar la incidencia");
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
        `¿Seguro que deseas eliminar la incidencia "${row.problema}"?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_data_quality")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando incidencia:", error);
        showToast("No se pudo eliminar la incidencia");
        return;
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Incidencia eliminada");
      return;
    }

    if (actionId === "clean") {
      await updateRow(row.id, {
        estado: "Corregido"
      });

      showToast("Incidencia marcada como corregida");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-data-quality.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-data-quality-page">
      <section className="admin-data-quality-hero">
        <div>
          <span className="admin-data-quality-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗 </h2>
          <p>Limpieza, homologación y preparación.</p>
        </div>

        <div className="admin-data-quality-hero-actions">
          <button onClick={openCreate}>Registrar incidencia</button>
          <button onClick={() => downloadCsv("admin-data-quality.csv", filteredRows)}>
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-data-quality-toolbar">
        <label className="admin-data-quality-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por fuente, problema, severidad o estado..."
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

      <section className="admin-data-quality-summary">
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

      <section className="admin-data-quality-table-card">
        <div className="admin-data-quality-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Calidad de datos</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="admin-data-quality-table-wrap">
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
                          className={`admin-data-quality-badge ${badgeClass(
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
                    <div className="admin-data-quality-row-actions">
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
                    className="admin-data-quality-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-data-quality-empty"
                  >
                    Cargando registros desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-data-quality-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-data-quality-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-data-quality-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-data-quality-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-data-quality-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-data-quality-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-data-quality-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-data-quality-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-data-quality-modal admin-data-quality-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-data-quality-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-data-quality-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-data-quality-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "severidad" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Baja</option>
                      <option>Media</option>
                      <option>Alta</option>
                      <option>Crítica</option>
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
                      <option>En proceso</option>
                      <option>Corregido</option>
                      <option>Observado</option>
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

            <div className="admin-data-quality-modal-actions">
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