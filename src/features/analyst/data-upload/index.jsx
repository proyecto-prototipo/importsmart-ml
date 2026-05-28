import { useMemo, useState } from "react";
import "./styles.css";

const initialRows = [
  {
    "id": 1,
    "fuente": "SUNARP parque automotor",
    "tipo": "CSV",
    "registros": "48,230",
    "estado": "Validado",
    "fecha": "2026-05-21",
    "errores": "0",
    "responsable": "Analista"
  },
  {
    "id": 2,
    "fuente": "Ventas históricas 2024-2026",
    "tipo": "Excel",
    "registros": "31,804",
    "estado": "En limpieza",
    "fecha": "2026-05-20",
    "errores": "127",
    "responsable": "Analista"
  },
  {
    "id": 3,
    "fuente": "Inventario actual",
    "tipo": "Excel",
    "registros": "5,430",
    "estado": "Validado",
    "fecha": "2026-05-19",
    "errores": "12",
    "responsable": "Admin"
  },
  {
    "id": 4,
    "fuente": "Catálogo proveedores",
    "tipo": "CSV",
    "registros": "8,910",
    "estado": "Pendiente",
    "fecha": "2026-05-18",
    "errores": "64",
    "responsable": "Admin"
  }
];
const columns = [
  {
    "key": "fuente",
    "label": "Fuente"
  },
  {
    "key": "tipo",
    "label": "Tipo"
  },
  {
    "key": "registros",
    "label": "Registros"
  },
  {
    "key": "estado",
    "label": "Estado"
  },
  {
    "key": "fecha",
    "label": "Fecha"
  },
  {
    "key": "errores",
    "label": "Errores"
  },
  {
    "key": "responsable",
    "label": "Responsable"
  }
];
const filterFields = ["tipo", "estado"];
const actions = [{"id": "view", "label": "Ver detalle"}, {"id": "edit", "label": "Editar"}, {"id": "validate", "label": "Validar"}, {"id": "clean", "label": "Limpiar"}];
const formFields = ["fuente", "tipo", "registros", "estado", "errores", "responsable"];
const fieldLabels = Object.fromEntries(columns.map((column) => [column.key, column.label]));

function normalize(value) {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function downloadCsv(filename, rows) {
  const headers = columns.map((column) => column.label).join(",");
  const body = rows.map((row) => columns.map((column) => `"${String(row[column.key] ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([headers + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function badgeClass(value) {
  const text = normalize(value);
  if (text.includes("alta") || text.includes("activo") || text.includes("aprob") || text.includes("listo") || text.includes("produccion") || text.includes("validado") || text.includes("operativa") || text.includes("rentable") || text.includes("bajo") || text.includes("normal")) return "success";
  if (text.includes("pend") || text.includes("revision") || text.includes("medio") || text.includes("media") || text.includes("observ") || text.includes("pruebas") || text.includes("generacion")) return "warning";
  if (text.includes("rechaz") || text.includes("critico") || text.includes("alta") && text.includes("riesgo") || text.includes("alto") || text.includes("no leido") || text.includes("sobrestock")) return "danger";
  return "neutral";
}

function createBlankRow() {
  const row = { id: Date.now() };
  formFields.forEach((key) => { row[key] = ""; });
  return row;
}

export default function AnalystDataUploadPage() {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(() => Object.fromEntries(filterFields.map((field) => [field, "Todos"])));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(createBlankRow());
  const [toast, setToast] = useState("");

  const optionsByFilter = useMemo(() => {
    return Object.fromEntries(filterFields.map((field) => [field, ["Todos", ...new Set(rows.map((row) => row[field]).filter(Boolean))]]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = normalize(search);
    return rows.filter((row) => {
      const matchesText = !term || normalize((row.fuente ?? "") + " " + (row.tipo ?? "") + " " + (row.registros ?? "") + " " + (row.estado ?? "") + " " + (row.fecha ?? "") + " " + (row.errores ?? "") + " " + (row.responsable ?? "")).includes(term);
      const matchesFilters = filterFields.every((field) => filters[field] === "Todos" || row[field] === filters[field]);
      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function openCreate() {
    setForm(createBlankRow());
    setModal({ type: "form", title: "Cargar archivo", mode: "create" });
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
      setRows((prev) => prev.map((row) => row.id === form.id ? form : row));
      showToast("Cambios guardados correctamente");
    }
    setModal(null);
  }

  function updateRow(id, updates) {
    setRows((prev) => prev.map((row) => row.id === id ? { ...row, ...updates } : row));
  }

  function runAction(actionId, row) {
    if (actionId === "view") { setModal({ type: "detail", row }); return; }
    if (actionId === "edit") { openEdit(row); return; }
    if (actionId === "delete") { setRows((prev) => prev.filter((item) => item.id !== row.id)); showToast("Registro eliminado"); return; }
    if (actionId === "approve") { updateRow(row.id, { estado: "Aprobado" }); showToast("Aprobado correctamente"); return; }
    if (actionId === "reject") { updateRow(row.id, { estado: "Rechazado" }); showToast("Registro observado o rechazado"); return; }
    if (actionId === "send") { updateRow(row.id, { estado: "En revisión" }); showToast("Propuesta enviada a gerencia"); return; }
    if (actionId === "validate") { updateRow(row.id, { estado: "Validado", errores: "0" }); showToast("Validación simulada completada"); return; }
    if (actionId === "clean") { updateRow(row.id, { estado: "Corregido", errores: "0" }); showToast("Limpieza simulada ejecutada"); return; }
    if (actionId === "read") { updateRow(row.id, { estado: "Leído" }); showToast("Alerta marcada como leída"); return; }
    if (actionId === "backup") { updateRow(row.id, { estado: "Respaldada" }); showToast("Respaldo generado"); return; }
    if (actionId === "deploy") { updateRow(row.id, { estado: "Producción" }); showToast("Modelo publicado en producción"); return; }
    if (actionId === "retrain") { setRows((prev) => [{ ...row, id: Date.now(), version: "v" + (2 + Math.random()).toFixed(1), estado: "Pruebas" }, ...prev]); showToast("Reentrenamiento simulado generado"); return; }
    if (actionId === "toggle") { updateRow(row.id, { estado: row.estado === "Activo" ? "Inactivo" : "Activo" }); showToast("Estado actualizado"); return; }
    if (actionId === "reorder") { updateRow(row.id, { sugerencia: "Orden de reposición creada" }); showToast("Reposición sugerida"); return; }
    if (actionId === "generate") { updateRow(row.id, { estado: "Listo" }); showToast("Reporte generado"); return; }
    if (actionId === "download") { downloadCsv("analyst-data-upload.csv", [row]); showToast("Archivo CSV descargado"); return; }
    showToast("Acción simulada correctamente");
  }

  return (
    <main className="analyst-data-upload-page">
      <section className="analyst-data-upload-hero">
        <div>
          <span className="analyst-data-upload-eyebrow">Analista comercial</span>
          <h2>Carga de datos</h2>
          <p>Carga de ventas, parque automotor y catálogos. Este módulo tiene su propio código, estilos, estados, filtros, tabla y ventana dentro de <strong>src/features/analyst/data-upload</strong>.</p>
        </div>
        <div className="analyst-data-upload-hero-actions">
          <button onClick={openCreate}>Cargar archivo</button>
          <button onClick={() => downloadCsv("analyst-data-upload.csv", filteredRows)}>Exportar CSV</button>
        </div>
      </section>

      <section className="analyst-data-upload-toolbar">
        <label className="analyst-data-upload-search">Buscar
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por texto, región, producto, estado..." />
        </label>
        {filterFields.map((field) => (
          <label key={field}> {fieldLabels[field] ?? field}
            <select value={filters[field]} onChange={(event) => setFilters((prev) => ({ ...prev, [field]: event.target.value }))}>
              {optionsByFilter[field].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        ))}
      </section>

      <section className="analyst-data-upload-summary">
        <article><strong>{rows.length}</strong><span>registros totales</span></article>
        <article><strong>{filteredRows.length}</strong><span>resultado filtrado</span></article>
        <article><strong>{filterFields.length}</strong><span>filtros activos</span></article>
      </section>

      <section className="analyst-data-upload-table-card">
        <div className="analyst-data-upload-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Carga de datos</h3>
          </div>
          <small>{filteredRows.length} resultados</small>
        </div>
        <div className="analyst-data-upload-table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {["estado", "prioridad", "riesgo", "rotacion", "severidad", "probabilidad", "concentracion", "escenario"].includes(column.key)
                        ? <span className={`analyst-data-upload-badge ${badgeClass(row[column.key])}`}>{row[column.key]}</span>
                        : row[column.key]}
                    </td>
                  ))}
                  <td>
                    <div className="analyst-data-upload-row-actions">
                      {actions.map((action) => <button key={action.id} onClick={() => runAction(action.id, row)}>{action.label}</button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td colSpan={columns.length + 1} className="analyst-data-upload-empty">No hay resultados para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="analyst-data-upload-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div className="analyst-data-upload-modal-backdrop" onClick={() => setModal(null)}>
          <section className="analyst-data-upload-modal" onClick={(event) => event.stopPropagation()}>
            <button className="analyst-data-upload-close" onClick={() => setModal(null)}>×</button>
            <span className="analyst-data-upload-eyebrow">Detalle</span>
            <h3>Información del registro</h3>
            <div className="analyst-data-upload-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>
            <div className="analyst-data-upload-modal-actions"><button onClick={() => setModal(null)}>Cerrar</button></div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div className="analyst-data-upload-modal-backdrop" onClick={() => setModal(null)}>
          <form className="analyst-data-upload-modal analyst-data-upload-form" onSubmit={saveForm} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="analyst-data-upload-close" onClick={() => setModal(null)}>×</button>
            <span className="analyst-data-upload-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>
            <div className="analyst-data-upload-form-grid">
              {formFields.map((field) => (
                <label key={field}>{fieldLabels[field] ?? field}
                  <input value={form[field] ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))} placeholder={fieldLabels[field] ?? field} />
                </label>
              ))}
            </div>
            <div className="analyst-data-upload-modal-actions">
              <button type="button" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
