import { useMemo, useState } from "react";
import "./styles.css";

const initialRows = [
  {
    "id": 1,
    "region": "Lima",
    "marca": "Toyota",
    "modelo": "Hilux",
    "tipo": "Pick-up",
    "unidades": "18,420",
    "crecimiento": "12.5%",
    "antiguedad": "6 años",
    "concentracion": "Alta"
  },
  {
    "id": 2,
    "region": "Arequipa",
    "marca": "Hyundai",
    "modelo": "Accent",
    "tipo": "Sedán",
    "unidades": "9,860",
    "crecimiento": "8.1%",
    "antiguedad": "7 años",
    "concentracion": "Media"
  },
  {
    "id": 3,
    "region": "La Libertad",
    "marca": "Nissan",
    "modelo": "NP300",
    "tipo": "Pick-up",
    "unidades": "7,420",
    "crecimiento": "10.2%",
    "antiguedad": "5 años",
    "concentracion": "Alta"
  },
  {
    "id": 4,
    "region": "Piura",
    "marca": "Chevrolet",
    "modelo": "Spark",
    "tipo": "Hatchback",
    "unidades": "5,120",
    "crecimiento": "3.4%",
    "antiguedad": "8 años",
    "concentracion": "Media"
  },
  {
    "id": 5,
    "region": "Lambayeque",
    "marca": "Toyota",
    "modelo": "Corolla",
    "tipo": "Sedán",
    "unidades": "4,980",
    "crecimiento": "6.7%",
    "antiguedad": "6 años",
    "concentracion": "Media"
  }
];
const columns = [
  {
    "key": "region",
    "label": "Región"
  },
  {
    "key": "marca",
    "label": "Marca"
  },
  {
    "key": "modelo",
    "label": "Modelo"
  },
  {
    "key": "tipo",
    "label": "Tipo"
  },
  {
    "key": "unidades",
    "label": "Unidades"
  },
  {
    "key": "crecimiento",
    "label": "Crecimiento"
  },
  {
    "key": "antiguedad",
    "label": "Antigüedad"
  },
  {
    "key": "concentracion",
    "label": "Concentración"
  }
];
const filterFields = ["region", "marca", "tipo"];
const actions = [{"id": "view", "label": "Ver detalle"}];
const formFields = ["region", "marca", "modelo", "tipo", "unidades", "crecimiento", "antiguedad", "concentracion"];
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

export default function AnalystAutomotiveParkPage() {
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
      const matchesText = !term || normalize((row.region ?? "") + " " + (row.marca ?? "") + " " + (row.modelo ?? "") + " " + (row.tipo ?? "") + " " + (row.unidades ?? "") + " " + (row.crecimiento ?? "") + " " + (row.antiguedad ?? "") + " " + (row.concentracion ?? "")).includes(term);
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
    if (actionId === "download") { downloadCsv("analyst-automotive-park.csv", [row]); showToast("Archivo CSV descargado"); return; }
    showToast("Acción simulada correctamente");
  }

  return (
    <main className="analyst-automotive-park-page">
      <section className="analyst-automotive-park-hero">
        <div>
          <span className="analyst-automotive-park-eyebrow">Analista comercial</span>
          <h2>Parque automotor</h2>
          <p>Segmentación regional de marcas, modelos y años. Este módulo tiene su propio código, estilos, estados, filtros, tabla y ventana dentro de <strong>src/features/analyst/automotive-park</strong>.</p>
        </div>
        <div className="analyst-automotive-park-hero-actions">

          <button onClick={() => downloadCsv("analyst-automotive-park.csv", filteredRows)}>Exportar CSV</button>
        </div>
      </section>

      <section className="analyst-automotive-park-toolbar">
        <label className="analyst-automotive-park-search">Buscar
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

      <section className="analyst-automotive-park-summary">
        <article><strong>{rows.length}</strong><span>registros totales</span></article>
        <article><strong>{filteredRows.length}</strong><span>resultado filtrado</span></article>
        <article><strong>{filterFields.length}</strong><span>filtros activos</span></article>
      </section>

      <section className="analyst-automotive-park-table-card">
        <div className="analyst-automotive-park-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Parque automotor</h3>
          </div>
          <small>{filteredRows.length} resultados</small>
        </div>
        <div className="analyst-automotive-park-table-wrap">
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
                        ? <span className={`analyst-automotive-park-badge ${badgeClass(row[column.key])}`}>{row[column.key]}</span>
                        : row[column.key]}
                    </td>
                  ))}
                  <td>
                    <div className="analyst-automotive-park-row-actions">
                      {actions.map((action) => <button key={action.id} onClick={() => runAction(action.id, row)}>{action.label}</button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td colSpan={columns.length + 1} className="analyst-automotive-park-empty">No hay resultados para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="analyst-automotive-park-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div className="analyst-automotive-park-modal-backdrop" onClick={() => setModal(null)}>
          <section className="analyst-automotive-park-modal" onClick={(event) => event.stopPropagation()}>
            <button className="analyst-automotive-park-close" onClick={() => setModal(null)}>×</button>
            <span className="analyst-automotive-park-eyebrow">Detalle</span>
            <h3>Información del registro</h3>
            <div className="analyst-automotive-park-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>
            <div className="analyst-automotive-park-modal-actions"><button onClick={() => setModal(null)}>Cerrar</button></div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div className="analyst-automotive-park-modal-backdrop" onClick={() => setModal(null)}>
          <form className="analyst-automotive-park-modal analyst-automotive-park-form" onSubmit={saveForm} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="analyst-automotive-park-close" onClick={() => setModal(null)}>×</button>
            <span className="analyst-automotive-park-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>
            <div className="analyst-automotive-park-form-grid">
              {formFields.map((field) => (
                <label key={field}>{fieldLabels[field] ?? field}
                  <input value={form[field] ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))} placeholder={fieldLabels[field] ?? field} />
                </label>
              ))}
            </div>
            <div className="analyst-automotive-park-modal-actions">
              <button type="button" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
