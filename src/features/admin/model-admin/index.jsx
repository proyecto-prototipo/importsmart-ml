import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const columns = [
  {
    key: "version",
    label: "Versión"
  },
  {
    key: "algoritmo",
    label: "Algoritmo"
  },
  {
    key: "mae",
    label: "MAE"
  },
  {
    key: "rmse",
    label: "RMSE"
  },
  {
    key: "precision",
    label: "Precisión"
  },
  {
    key: "regionError",
    label: "Error regional"
  },
  {
    key: "estado",
    label: "Estado"
  }
];

const filterFields = ["algoritmo", "estado"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "edit", label: "Editar" },
  { id: "deploy", label: "Publicar" },
  { id: "retrain", label: "Reentrenar" }
];

const formFields = [
  "version",
  "algoritmo",
  "mae",
  "rmse",
  "precision",
  "regionError",
  "estado"
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
    text.includes("producción") ||
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
    version: "",
    algoritmo: "Gradient Boosting",
    mae: "0",
    rmse: "0",
    precision: "0%",
    regionError: "0%",
    estado: "Pruebas"
  };
}

export default function AdminModelAdminPage() {
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
      .from("admin_model_admin")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando modelos ML:", error);
      showToast("No se pudieron cargar los modelos ML");
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
          `${row.version ?? ""} ${row.algoritmo ?? ""} ${row.mae ?? ""} ${row.rmse ?? ""} ${row.precision ?? ""} ${row.regionError ?? ""} ${row.estado ?? ""}`
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
    setModal({ type: "form", title: "Registrar modelo", mode: "create" });
  }

  function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar modelo", mode: "edit" });
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = {
      version: form.version,
      algoritmo: form.algoritmo,
      mae: form.mae,
      rmse: form.rmse,
      precision: form.precision,
      regionError: form.regionError,
      estado: form.estado
    };

    if (
      !payload.version ||
      !payload.algoritmo ||
      !payload.mae ||
      !payload.rmse ||
      !payload.precision ||
      !payload.regionError ||
      !payload.estado
    ) {
      showToast("Completa todos los campos");
      return;
    }

    const duplicateQuery = supabase
      .from("admin_model_admin")
      .select("id, version")
      .eq("version", payload.version);

    const { data: duplicate, error: duplicateError } =
      modal?.mode === "edit"
        ? await duplicateQuery.neq("id", form.id).maybeSingle()
        : await duplicateQuery.maybeSingle();

    if (duplicateError) {
      console.error("Error validando versión duplicada:", duplicateError);
      showToast("No se pudo validar la versión del modelo");
      return;
    }

    if (duplicate) {
      showToast(`La versión ${payload.version} ya existe`);
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_model_admin")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error registrando modelo:", error);
        showToast(error.message || "No se pudo registrar el modelo");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Modelo registrado correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_model_admin")
        .update(payload)
        .eq("id", form.id)
        .select()
        .single();

      if (error) {
        console.error("Error editando modelo:", error);
        showToast(error.message || "No se pudieron guardar los cambios");
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
      .from("admin_model_admin")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando modelo:", error);
      showToast("No se pudo actualizar el modelo");
      return null;
    }

    setRows((prev) => prev.map((row) => (row.id === id ? data : row)));
    return data;
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
        `¿Seguro que deseas eliminar el modelo "${row.version}"?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_model_admin")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando modelo:", error);
        showToast("No se pudo eliminar el modelo");
        return;
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Modelo eliminado");
      return;
    }

    if (actionId === "deploy") {
      const confirmDeploy = window.confirm(
        `¿Publicar ${row.version} en producción? El modelo actual en producción será archivado.`
      );

      if (!confirmDeploy) return;

      const { error: archiveError } = await supabase
        .from("admin_model_admin")
        .update({ estado: "Archivado" })
        .eq("estado", "Producción")
        .neq("id", row.id);

      if (archiveError) {
        console.error("Error archivando modelos anteriores:", archiveError);
        showToast("No se pudo archivar el modelo anterior");
        return;
      }

      setRows((prev) =>
        prev.map((item) =>
          item.estado === "Producción" && item.id !== row.id
            ? { ...item, estado: "Archivado" }
            : item
        )
      );

      await updateRow(row.id, { estado: "Producción" });
      showToast("Modelo publicado en producción");
      return;
    }

    if (actionId === "retrain") {
      const suffix = Date.now().toString().slice(-5);

      const newModel = {
        version: `${row.version}-rt-${suffix}`,
        algoritmo: row.algoritmo,
        mae: row.mae,
        rmse: row.rmse,
        precision: row.precision,
        regionError: row.regionError,
        estado: "Pruebas"
      };

      const { data, error } = await supabase
        .from("admin_model_admin")
        .insert([newModel])
        .select()
        .single();

      if (error) {
        console.error("Error generando reentrenamiento:", error);
        showToast("No se pudo generar el reentrenamiento");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Reentrenamiento generado en estado Pruebas");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-model-admin.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-model-admin-page">
      <section className="admin-model-admin-hero">
        <div>
          <span className="admin-model-admin-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗</h2>
          <p>
            Aquí podrá tener su vista operativa, como el versionado, métricas y reentrenamiento. 
          </p>
        </div>

        <div className="admin-model-admin-hero-actions">
          <button onClick={openCreate}>Registrar modelo</button>
          <button
            onClick={() =>
              downloadCsv("admin-model-admin.csv", filteredRows)
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-model-admin-toolbar">
        <label className="admin-model-admin-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por versión, algoritmo, métrica o estado..."
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

      <section className="admin-model-admin-summary">
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

      <section className="admin-model-admin-table-card">
        <div className="admin-model-admin-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Administración de modelos ML</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="admin-model-admin-table-wrap">
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
                          className={`admin-model-admin-badge ${badgeClass(
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
                    <div className="admin-model-admin-row-actions">
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
                    className="admin-model-admin-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-model-admin-empty"
                  >
                    Cargando modelos desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-model-admin-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-model-admin-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-model-admin-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-model-admin-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-model-admin-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-model-admin-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-model-admin-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-model-admin-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-model-admin-modal admin-model-admin-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-model-admin-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-model-admin-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-model-admin-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "algoritmo" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Gradient Boosting</option>
                      <option>Random Forest</option>
                      <option>XGBoost</option>
                      <option>LightGBM</option>
                      <option>Regresión lineal</option>
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
                      <option>Producción</option>
                      <option>Pruebas</option>
                      <option>Archivado</option>
                      <option>Error</option>
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

            <div className="admin-model-admin-modal-actions">
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