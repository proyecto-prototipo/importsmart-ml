import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const columns = [
  {
    key: "fuente",
    label: "Fuente"
  },
  {
    key: "tipo",
    label: "Tipo"
  },
  {
    key: "registros",
    label: "Registros"
  },
  {
    key: "estado",
    label: "Estado"
  },
  {
    key: "fecha",
    label: "Fecha"
  },
  {
    key: "errores",
    label: "Errores"
  },
  {
    key: "responsable",
    label: "Responsable"
  }
];

const filterFields = ["tipo", "estado"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "edit", label: "Editar" },
  { id: "validate", label: "Validar" },
  { id: "clean", label: "Limpiar" }
];

const formFields = [
  "fuente",
  "tipo",
  "registros",
  "estado",
  "fecha",
  "errores",
  "responsable"
];

const fieldLabels = Object.fromEntries(
  columns.map((column) => [column.key, column.label])
);

const sunarpDemoRows = [
  {
    marca: "Toyota",
    modelo: "Hilux",
    anio: "2018-2023",
    tipoVehiculo: "Pick-up",
    region: "Lima",
    cantidad: "12,480",
    crecimiento: "+14%",
    antiguedadPromedio: "5.8 años",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    marca: "Hyundai",
    modelo: "Accent",
    anio: "2015-2022",
    tipoVehiculo: "Sedán",
    region: "Arequipa",
    cantidad: "8,920",
    crecimiento: "+9%",
    antiguedadPromedio: "7.2 años",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    marca: "Toyota",
    modelo: "Corolla",
    anio: "2016-2024",
    tipoVehiculo: "Sedán",
    region: "Lambayeque",
    cantidad: "6,740",
    crecimiento: "+11%",
    antiguedadPromedio: "6.4 años",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    marca: "Nissan",
    modelo: "NP300",
    anio: "2017-2023",
    tipoVehiculo: "Pick-up",
    region: "La Libertad",
    cantidad: "5,980",
    crecimiento: "+8%",
    antiguedadPromedio: "6.1 años",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  },
  {
    marca: "Chevrolet",
    modelo: "Spark",
    anio: "2014-2021",
    tipoVehiculo: "Hatchback",
    region: "Piura",
    cantidad: "4,110",
    crecimiento: "+5%",
    antiguedadPromedio: "8.3 años",
    fuente: "SUNARP",
    ultimaActualizacion: "2026-05-21",
    estado: "Validado"
  }
];

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
    text.includes("limpieza")
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
  return {
    id: null,
    fuente: "",
    tipo: "CSV",
    registros: "0",
    estado: "Pendiente",
    fecha: new Date().toISOString().slice(0, 10),
    errores: "0",
    responsable: "Admin"
  };
}

export default function AdminDataIntegrationPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
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
      .from("admin_data_integration")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando integración de datos:", error);
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
          `${row.fuente ?? ""} ${row.tipo ?? ""} ${row.registros ?? ""} ${row.estado ?? ""} ${row.fecha ?? ""} ${row.errores ?? ""} ${row.responsable ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  const sunarpSource = useMemo(() => {
    return rows.find((row) => normalize(row.fuente).includes("sunarp"));
  }, [rows]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function addSyncLog(message) {
    setSyncLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        message
      }
    ]);
  }

  function openCreate() {
    setForm(createBlankRow());
    setModal({ type: "form", title: "Registrar fuente", mode: "create" });
  }

  function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar registro", mode: "edit" });
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = {
      fuente: form.fuente,
      tipo: form.tipo,
      registros: form.registros,
      estado: form.estado,
      fecha: form.fecha,
      errores: form.errores,
      responsable: form.responsable
    };

    if (!payload.fuente || !payload.tipo || !payload.estado || !payload.responsable) {
      showToast("Completa fuente, tipo, estado y responsable");
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_data_integration")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error registrando fuente:", error);
        showToast("No se pudo registrar la fuente");
        return;
      }

      setRows((prev) => [data, ...prev]);
      showToast("Registro creado correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_data_integration")
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
      .from("admin_data_integration")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando registro:", error);
      showToast("No se pudo actualizar el registro");
      return null;
    }

    setRows((prev) => prev.map((row) => (row.id === id ? data : row)));

    return data;
  }

  async function syncSunarpDemo() {
    if (syncing) return;

    setSyncing(true);
    setSyncLogs([]);
    setModal({ type: "sunarp-sync" });

    try {
      addSyncLog("Conectando con fuente SUNARP parque automotor...");
      await wait(650);

      addSyncLog("Leyendo registros vehiculares por marca, modelo, año y región...");
      await wait(800);

      addSyncLog("Homologando marcas y modelos para análisis comercial...");
      await wait(750);

      addSyncLog("Validando duplicados, registros nulos y consistencia regional...");
      await wait(750);

      addSyncLog("Guardando información en la tabla admin_vehicle_fleet...");
      await wait(700);

      const { error: deleteError } = await supabase
        .from("admin_vehicle_fleet")
        .delete()
        .eq("fuente", "SUNARP");

      if (deleteError) {
        console.error("Error limpiando parque automotor SUNARP:", deleteError);
        showToast("No se pudo limpiar la carga anterior de SUNARP");
        setSyncing(false);
        return;
      }

      const payloadFleet = sunarpDemoRows.map((row) => ({
        marca: row.marca,
        modelo: row.modelo,
        anio: row.anio,
        tipoVehiculo: row.tipoVehiculo,
        region: row.region,
        cantidad: row.cantidad,
        crecimiento: row.crecimiento,
        antiguedadPromedio: row.antiguedadPromedio,
        fuente: row.fuente,
        ultimaActualizacion: row.ultimaActualizacion,
        estado: row.estado
      }));

      const { error: insertFleetError } = await supabase
        .from("admin_vehicle_fleet")
        .insert(payloadFleet);

      if (insertFleetError) {
        console.error("Error insertando parque automotor:", insertFleetError);
        showToast("No se pudo guardar el parque automotor");
        setSyncing(false);
        return;
      }

      addSyncLog("Actualizando fuente SUNARP dentro de Integración de datos...");
      await wait(500);

      const sourcePayload = {
        fuente: "SUNARP parque automotor",
        tipo: "Excel",
        registros: "48,230",
        estado: "Validado",
        fecha: todayISO(),
        errores: "0",
        responsable: "Analista"
      };

      if (sunarpSource?.id) {
        await updateRow(sunarpSource.id, sourcePayload);
      } else {
        const { data, error } = await supabase
          .from("admin_data_integration")
          .insert([sourcePayload])
          .select()
          .single();

        if (error) {
          console.error("Error creando fuente SUNARP:", error);
          showToast("No se pudo crear la fuente SUNARP");
          setSyncing(false);
          return;
        }

        setRows((prev) => [data, ...prev]);
      }

      addSyncLog("Sincronización SUNARP completada correctamente.");
      await loadRows();

      showToast("SUNARP sincronizado correctamente");
    } catch (error) {
      console.error("Error sincronizando SUNARP:", error);
      showToast("Ocurrió un error sincronizando SUNARP");
    } finally {
      setSyncing(false);
    }
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
        `¿Seguro que deseas eliminar la fuente "${row.fuente}"?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_data_integration")
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

    if (actionId === "validate") {
      await updateRow(row.id, {
        estado: "Validado",
        errores: "0"
      });

      showToast("Validación completada");
      return;
    }

    if (actionId === "clean") {
      await updateRow(row.id, {
        estado: "Corregido",
        errores: "0"
      });

      showToast("Limpieza ejecutada correctamente");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-data-integration.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-data-integration-page">
      <section className="admin-data-integration-hero">
        <div>
          <span className="admin-data-integration-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗 </h2>
          <p>Aquí podrás realizar carga, validación y fuentes de información.</p>
        </div>

        <div className="admin-data-integration-hero-actions">
          <button onClick={openCreate}>Registrar fuente</button>

          <button
            className="admin-data-integration-sunarp-btn"
            onClick={syncSunarpDemo}
            disabled={syncing}
          >
            {syncing ? "Sincronizando..." : "Sincronizar SUNARP"}
          </button>

          <button
            onClick={() =>
              downloadCsv("admin-data-integration.csv", filteredRows)
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-sunarp-simulation-card">
        <div>
          <span>Fuente conectada</span>
          <h3>SUNARP parque automotor</h3>
          <p>
            Esta simulación carga registros vehiculares por marca, modelo, año y región.
            Los datos se guardan en <strong>admin_vehicle_fleet</strong> para que el rol
            Usuario consulta pueda visualizarlos en Parque automotor.
          </p>
        </div>

        <div className="admin-sunarp-status">
          <article>
            <strong>{sunarpSource?.registros ?? "48,230"}</strong>
            <span>registros SUNARP</span>
          </article>

          <article>
            <strong>{sunarpSource?.estado ?? "Pendiente"}</strong>
            <span>estado de fuente</span>
          </article>

          <article>
            <strong>{sunarpSource?.fecha ?? todayISO()}</strong>
            <span>última carga</span>
          </article>
        </div>
      </section>

      <section className="admin-data-integration-toolbar">
        <label className="admin-data-integration-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por texto, región, producto, estado..."
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

      <section className="admin-data-integration-summary">
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

      <section className="admin-data-integration-table-card">
        <div className="admin-data-integration-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Integración de datos</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="admin-data-integration-table-wrap">
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
                          className={`admin-data-integration-badge ${badgeClass(
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
                    <div className="admin-data-integration-row-actions">
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
                    className="admin-data-integration-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-data-integration-empty"
                  >
                    Cargando registros desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-data-integration-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-data-integration-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-data-integration-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-data-integration-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-data-integration-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-data-integration-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-data-integration-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "sunarp-sync" && (
        <div
          className="admin-data-integration-modal-backdrop"
          onClick={() => !syncing && setModal(null)}
        >
          <section
            className="admin-data-integration-modal admin-sunarp-sync-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-data-integration-close"
              onClick={() => !syncing && setModal(null)}
              disabled={syncing}
            >
              ×
            </button>

            <span className="admin-data-integration-eyebrow">SUNARP</span>
            <h3>Sincronización de parque automotor</h3>
            <p>
              Simulación de carga oficial para alimentar el módulo Parque automotor
              del rol Usuario consulta.
            </p>

            <div className="admin-sunarp-progress">
              <div className="admin-sunarp-spinner" />
              <strong>
                {syncing ? "Procesando datos..." : "Proceso completado"}
              </strong>
            </div>

            <div className="admin-sunarp-log-list">
              {syncLogs.map((log) => (
                <article key={log.id}>
                  <span>✓</span>
                  <p>{log.message}</p>
                </article>
              ))}
            </div>

            <div className="admin-data-integration-modal-actions">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={syncing}
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-data-integration-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-data-integration-modal admin-data-integration-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-data-integration-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-data-integration-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-data-integration-form-grid">
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
                      <option>CSV</option>
                      <option>Excel</option>
                      <option>API</option>
                      <option>Base de datos</option>
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
                      <option>En limpieza</option>
                      <option>Validado</option>
                      <option>Corregido</option>
                      <option>Rechazado</option>
                    </select>
                  ) : field === "fecha" ? (
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

            <div className="admin-data-integration-modal-actions">
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