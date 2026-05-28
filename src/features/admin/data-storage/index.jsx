import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const columns = [
  {
    key: "tabla",
    label: "Tabla"
  },
  {
    key: "registros",
    label: "Registros"
  },
  {
    key: "ultimaCarga",
    label: "Última carga"
  },
  {
    key: "estado",
    label: "Estado"
  },
  {
    key: "responsable",
    label: "Responsable"
  },
  {
    key: "respaldo",
    label: "Respaldo"
  }
];

const filterFields = ["estado", "responsable"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "edit", label: "Editar" },
  { id: "backup", label: "Respaldar" }
];

const formFields = [
  "tabla",
  "registros",
  "ultimaCarga",
  "estado",
  "responsable",
  "respaldo"
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
    text.includes("sincronizada") ||
    text.includes("actualizada") ||
    text.includes("respaldada") ||
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
    tabla: "",
    registros: "0",
    ultimaCarga: new Date().toISOString().slice(0, 10),
    estado: "Operativa",
    responsable: "Admin",
    respaldo: "Diario"
  };
}

export default function AdminDataStoragePage() {
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
      .from("admin_data_storage")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando almacenamiento de datos:", error);
      showToast("No se pudieron cargar los registros");
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
          `${row.tabla ?? ""} ${row.registros ?? ""} ${row.ultimaCarga ?? ""} ${row.estado ?? ""} ${row.responsable ?? ""} ${row.respaldo ?? ""}`
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
      tabla: form.tabla,
      registros: form.registros,
      ultimaCarga: form.ultimaCarga,
      estado: form.estado,
      responsable: form.responsable,
      respaldo: form.respaldo
    };

    if (
      !payload.tabla ||
      !payload.registros ||
      !payload.ultimaCarga ||
      !payload.estado ||
      !payload.responsable ||
      !payload.respaldo
    ) {
      showToast("Completa todos los campos");
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_data_storage")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error creando registro:", error);
        showToast("No se pudo crear el registro");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Registro creado correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_data_storage")
        .update(payload)
        .eq("id", form.id)
        .select()
        .single();

      if (error) {
        console.error("Error editando registro:", error);
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
      .from("admin_data_storage")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando registro:", error);
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
        `¿Seguro que deseas eliminar la tabla "${row.tabla}"?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_data_storage")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando registro:", error);
        showToast("No se pudo eliminar el registro");
        return;
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Registro eliminado");
      return;
    }

    if (actionId === "backup") {
      await updateRow(row.id, {
        estado: "Respaldada",
        ultimaCarga: new Date().toISOString().slice(0, 10)
      });

      showToast("Respaldo generado correctamente");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-data-storage.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-data-storage-page">
      <section className="admin-data-storage-hero">
        <div>
          <span className="admin-data-storage-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗 </h2>
          <p>Aquí podrás crear tablas maestras, repositorios y respaldos.</p>
        </div>

        <div className="admin-data-storage-hero-actions">
          <button onClick={openCreate}>Nuevo registro</button>
          <button onClick={() => downloadCsv("admin-data-storage.csv", filteredRows)}>
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-data-storage-toolbar">
        <label className="admin-data-storage-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por tabla, estado, responsable..."
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

      <section className="admin-data-storage-summary">
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

      <section className="admin-data-storage-table-card">
        <div className="admin-data-storage-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Almacenamiento de datos</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="admin-data-storage-table-wrap">
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
                          className={`admin-data-storage-badge ${badgeClass(
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
                    <div className="admin-data-storage-row-actions">
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
                    className="admin-data-storage-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-data-storage-empty"
                  >
                    Cargando registros desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-data-storage-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-data-storage-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-data-storage-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-data-storage-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-data-storage-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-data-storage-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-data-storage-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-data-storage-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-data-storage-modal admin-data-storage-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-data-storage-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-data-storage-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-data-storage-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "ultimaCarga" ? (
                    <input
                      type="date"
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    />
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
                      <option>Operativa</option>
                      <option>Sincronizada</option>
                      <option>Actualizada</option>
                      <option>Respaldada</option>
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
                      <option>Admin</option>
                      <option>Analista</option>
                      <option>Sistema</option>
                    </select>
                  ) : field === "respaldo" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Diario</option>
                      <option>Semanal</option>
                      <option>Mensual</option>
                      <option>Manual</option>
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

            <div className="admin-data-storage-modal-actions">
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