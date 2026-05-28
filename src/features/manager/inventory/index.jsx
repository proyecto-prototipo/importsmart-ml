import { useMemo, useState } from "react";
import "./styles.css";

const initialRows = [
  {
    "id": 1,
    "producto": "Kit embrague Hilux",
    "region": "Lima",
    "stockActual": "210",
    "stockMinimo": "500",
    "stockMaximo": "2,400",
    "demanda": "1,620",
    "estado": "Crítico",
    "sugerencia": "Reposición urgente"
  },
  {
    "id": 2,
    "producto": "Pastillas freno Accent",
    "region": "Arequipa",
    "stockActual": "620",
    "stockMinimo": "800",
    "stockMaximo": "4,000",
    "demanda": "3,150",
    "estado": "Crítico",
    "sugerencia": "Importar 3,500 uds"
  },
  {
    "id": 3,
    "producto": "Filtro aceite Corolla",
    "region": "Lambayeque",
    "stockActual": "900",
    "stockMinimo": "600",
    "stockMaximo": "1,700",
    "demanda": "1,180",
    "estado": "Normal",
    "sugerencia": "Monitorear"
  },
  {
    "id": 4,
    "producto": "Bomba de agua Spark",
    "region": "Piura",
    "stockActual": "470",
    "stockMinimo": "250",
    "stockMaximo": "700",
    "demanda": "210",
    "estado": "Sobrestock",
    "sugerencia": "No importar"
  }
];
const columns = [
  {
    "key": "producto",
    "label": "Producto"
  },
  {
    "key": "region",
    "label": "Región"
  },
  {
    "key": "stockActual",
    "label": "Stock actual"
  },
  {
    "key": "stockMinimo",
    "label": "Stock mín."
  },
  {
    "key": "stockMaximo",
    "label": "Stock máx."
  },
  {
    "key": "demanda",
    "label": "Demanda"
  },
  {
    "key": "estado",
    "label": "Estado"
  },
  {
    "key": "sugerencia",
    "label": "Sugerencia"
  }
];
const filterFields = ["region", "estado"];
const actions = [{"id": "view", "label": "Ver detalle"}, {"id": "edit", "label": "Editar"}, {"id": "reorder", "label": "Sugerir reposición"}];
const formFields = ["producto", "region", "stockActual", "stockMinimo", "stockMaximo", "demanda", "estado", "sugerencia"];
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

export default function ManagerInventoryPage() {
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
      const matchesText = !term || normalize((row.producto ?? "") + " " + (row.region ?? "") + " " + (row.stockActual ?? "") + " " + (row.stockMinimo ?? "") + " " + (row.stockMaximo ?? "") + " " + (row.demanda ?? "") + " " + (row.estado ?? "") + " " + (row.sugerencia ?? "")).includes(term);
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
    setModal({ type: "form", title: "Crear reposición", mode: "create" });
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
    if (actionId === "download") { downloadCsv("manager-inventory.csv", [row]); showToast("Archivo CSV descargado"); return; }
    showToast("Acción simulada correctamente");
  }

  return (
    <main className="manager-inventory-page">
      <section className="manager-inventory-hero">
        <div>
          <span className="manager-inventory-eyebrow">Gerente de importaciones</span>
          <h2>Inventario y abastecimiento</h2>
          <p>Stock crítico, sobrestock y reposición. Este módulo tiene su propio código, estilos, estados, filtros, tabla y ventana dentro de <strong>src/features/manager/inventory</strong>.</p>
        </div>
        <div className="manager-inventory-hero-actions">
          <button onClick={openCreate}>Crear reposición</button>
          <button onClick={() => downloadCsv("manager-inventory.csv", filteredRows)}>Exportar CSV</button>
        </div>
      </section>

      <section className="manager-inventory-toolbar">
        <label className="manager-inventory-search">Buscar
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

      <section className="manager-inventory-summary">
        <article><strong>{rows.length}</strong><span>registros totales</span></article>
        <article><strong>{filteredRows.length}</strong><span>resultado filtrado</span></article>
        <article><strong>{filterFields.length}</strong><span>filtros activos</span></article>
      </section>

      <section className="manager-inventory-table-card">
        <div className="manager-inventory-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Inventario y abastecimiento</h3>
          </div>
          <small>{filteredRows.length} resultados</small>
        </div>
        <div className="manager-inventory-table-wrap">
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
                        ? <span className={`manager-inventory-badge ${badgeClass(row[column.key])}`}>{row[column.key]}</span>
                        : row[column.key]}
                    </td>
                  ))}
                  <td>
                    <div className="manager-inventory-row-actions">
                      {actions.map((action) => <button key={action.id} onClick={() => runAction(action.id, row)}>{action.label}</button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td colSpan={columns.length + 1} className="manager-inventory-empty">No hay resultados para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="manager-inventory-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div className="manager-inventory-modal-backdrop" onClick={() => setModal(null)}>
          <section className="manager-inventory-modal" onClick={(event) => event.stopPropagation()}>
            <button className="manager-inventory-close" onClick={() => setModal(null)}>×</button>
            <span className="manager-inventory-eyebrow">Detalle</span>
            <h3>Información del registro</h3>
            <div className="manager-inventory-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>
            <div className="manager-inventory-modal-actions"><button onClick={() => setModal(null)}>Cerrar</button></div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div className="manager-inventory-modal-backdrop" onClick={() => setModal(null)}>
          <form className="manager-inventory-modal manager-inventory-form" onSubmit={saveForm} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="manager-inventory-close" onClick={() => setModal(null)}>×</button>
            <span className="manager-inventory-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>
            <div className="manager-inventory-form-grid">
              {formFields.map((field) => (
                <label key={field}>{fieldLabels[field] ?? field}
                  <input value={form[field] ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))} placeholder={fieldLabels[field] ?? field} />
                </label>
              ))}
            </div>
            <div className="manager-inventory-modal-actions">
              <button type="button" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
