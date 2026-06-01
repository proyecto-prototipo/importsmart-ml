import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import { logAuditAction } from "../../../shared/config/services/auditService.js";
import "./styles.css";

const initialRows = [
  {
    id: 1,
    nombre: "Carla Medina",
    correo: "admin@soonest.pe",
    rol: "Administrador",
    estado: "Activo",
    ultimoAcceso: "2026-05-21 09:15",
    permisos: "Total"
  },
  {
    id: 2,
    nombre: "Luis Rojas",
    correo: "analista@soonest.pe",
    rol: "Analista comercial",
    estado: "Activo",
    ultimoAcceso: "2026-05-21 10:40",
    permisos: "Analítico"
  },
  {
    id: 3,
    nombre: "María Salas",
    correo: "gerente@soonest.pe",
    rol: "Gerente de importaciones",
    estado: "Activo",
    ultimoAcceso: "2026-05-20 18:30",
    permisos: "Aprobación"
  },
  {
    id: 4,
    nombre: "Diego Paredes",
    correo: "consulta@soonest.pe",
    rol: "Usuario consulta",
    estado: "Activo",
    ultimoAcceso: "2026-05-20 12:10",
    permisos: "Solo lectura"
  }
];

const columns = [
  {
    key: "nombre",
    label: "Nombre"
  },
  {
    key: "correo",
    label: "Correo"
  },
  {
    key: "rol",
    label: "Rol"
  },
  {
    key: "estado",
    label: "Estado"
  },
  {
    key: "created_at",
    label: "Día de creación"
  },
  {
    key: "permisos",
    label: "Permisos"
  }
];

const filterFields = ["rol", "estado"];

const actions = [
  { id: "edit", label: "Editar" },
  { id: "suspend", label: "Suspender" },
  { id: "delete", label: "Eliminar" }
];

const formFields = ["nombre", "correo", "rol", "estado", "permisos"];

const fieldLabels = Object.fromEntries(
  columns.map((column) => [column.key, column.label])
);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ").replace("+00:00", "").slice(0, 16);
  }

  return date.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
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
    text.includes("suspendido") ||
    text.includes("inactivo")
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
    text.includes("eliminado")
  ) {
    return "danger";
  }

  return "neutral";
}

function createBlankRow() {
  return {
    id: null,
    nombre: "",
    correo: "",
    rol: "Usuario consulta",
    estado: "Activo",
    created_at: null,
    permisos: "Solo lectura"
  };
}

export default function AdminUsersSecurityPage() {
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
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("admin_users_security")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando usuarios:", error);
      showToast("No se pudieron cargar los usuarios");
      setRows(initialRows);
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
          `${row.nombre ?? ""} ${row.correo ?? ""} ${row.rol ?? ""} ${row.estado ?? ""} ${row.created_at ?? ""} ${row.permisos ?? ""}`
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

  async function safeAudit(payload) {
    try {
      await logAuditAction(payload);
    } catch (error) {
      console.error("Error registrando auditoría:", error);
    }
  }

  async function downloadUsersExcel() {
    const { data, error } = await supabase
      .from("admin_users_security")
      .select(
        "id, nombre, correo, rol, estado, permisos, created_at, updated_at"
      )
      .order("id", { ascending: true });

    if (error) {
      console.error("Error exportando usuarios:", error);
      showToast("No se pudo exportar el Excel de usuarios");
      return;
    }

    const excelRows = (data ?? []).map((row) => ({
      ID: row.id,
      Nombre: row.nombre,
      Correo: row.correo,
      Rol: row.rol,
      Estado: row.estado,
      "Día de creación": formatDate(row.created_at),
      Permisos: row.permisos,
      "Fecha de creación": row.created_at ?? "",
      "Última actualización": row.updated_at ?? ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 24 },
      { wch: 30 },
      { wch: 28 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
      { wch: 26 },
      { wch: 26 }
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    XLSX.writeFile(workbook, "usuarios-y-seguridad.xlsx");

    await safeAudit({
      accion: "Exportó usuarios a Excel",
      modulo: "Usuarios y seguridad",
      detalle: "Exportó la tabla completa de usuarios y seguridad",
      metadata: {
        totalRegistros: data?.length ?? 0
      }
    });

    showToast("Excel descargado correctamente");
  }

  function openCreate() {
    setForm(createBlankRow());
    setModal({ type: "form", title: "Nuevo usuario", mode: "create" });
  }

  async function openEdit(row) {
    setForm({ ...row });
    setModal({ type: "form", title: "Editar usuario", mode: "edit" });

    await safeAudit({
      accion: `Abrió edición de usuario ${row.correo}`,
      modulo: "Usuarios y seguridad",
      detalle: `Abrió el formulario de edición del usuario ${row.nombre}`,
      metadata: {
        id: row.id,
        nombre: row.nombre,
        correo: row.correo,
        rol: row.rol,
        estado: row.estado,
        permisos: row.permisos
      }
    });
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = {
      nombre: form.nombre,
      correo: form.correo,
      rol: form.rol,
      estado: form.estado || "Activo",
      permisos: form.permisos
    };

    if (!payload.nombre || !payload.correo || !payload.rol || !payload.permisos) {
      showToast("Completa nombre, correo, rol y permisos");
      return;
    }

    const duplicateQuery = supabase
      .from("admin_users_security")
      .select("id, correo")
      .eq("correo", payload.correo);

    const { data: duplicate, error: duplicateError } =
      modal?.mode === "edit"
        ? await duplicateQuery.neq("id", form.id).maybeSingle()
        : await duplicateQuery.maybeSingle();

    if (duplicateError) {
      console.error("Error validando correo:", duplicateError);
      showToast("No se pudo validar el correo");
      return;
    }

    if (duplicate) {
      showToast(`El correo ${payload.correo} ya está registrado`);
      return;
    }

    if (modal?.mode === "create") {
      const { data, error } = await supabase
        .from("admin_users_security")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error creando usuario:", error);
        showToast(error.message || "No se pudo crear el usuario");
        return;
      }

      await safeAudit({
        accion: `Creó usuario ${payload.correo}`,
        modulo: "Usuarios y seguridad",
        detalle: `Registró al usuario ${payload.nombre} con rol ${payload.rol}`,
        metadata: {
          id: data.id,
          nombre: payload.nombre,
          correo: payload.correo,
          rol: payload.rol,
          estado: payload.estado,
          permisos: payload.permisos
        }
      });

      setRows((prev) => [data, ...prev]);
      showToast("Usuario creado correctamente");
    } else {
      const { data, error } = await supabase
        .from("admin_users_security")
        .update(payload)
        .eq("id", form.id)
        .select()
        .single();

      if (error) {
        console.error("Error editando usuario:", error);
        showToast(error.message || "No se pudieron guardar los cambios");
        return;
      }

      await safeAudit({
        accion: `Editó usuario ${payload.correo}`,
        modulo: "Usuarios y seguridad",
        detalle: `Actualizó la información del usuario ${payload.nombre}`,
        metadata: {
          id: form.id,
          nombre: payload.nombre,
          correo: payload.correo,
          rol: payload.rol,
          estado: payload.estado,
          permisos: payload.permisos
        }
      });

      setRows((prev) =>
        prev.map((row) => (row.id === form.id ? data : row))
      );

      showToast("Cambios guardados correctamente");
    }

    setModal(null);
  }

  async function updateRow(id, updates) {
    const { data, error } = await supabase
      .from("admin_users_security")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando usuario:", error);
      showToast("No se pudo actualizar el usuario");
      return null;
    }

    setRows((prev) => prev.map((row) => (row.id === id ? data : row)));
    return data;
  }

  async function runAction(actionId, row) {
    if (actionId === "view") {
      setModal({ type: "detail", row });

      await safeAudit({
        accion: `Vio detalle de usuario ${row.correo}`,
        modulo: "Usuarios y seguridad",
        detalle: `Consultó la información del usuario ${row.nombre}`,
        metadata: {
          id: row.id,
          nombre: row.nombre,
          correo: row.correo,
          rol: row.rol,
          estado: row.estado,
          permisos: row.permisos
        }
      });

      return;
    }

    if (actionId === "edit") {
      await openEdit(row);
      return;
    }

    if (actionId === "delete") {
      const confirmDelete = window.confirm(
        `¿Seguro que deseas eliminar a ${row.nombre}?`
      );

      if (!confirmDelete) return;

      const { error } = await supabase
        .from("admin_users_security")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando usuario:", error);
        showToast("No se pudo eliminar el usuario");
        return;
      }

      await safeAudit({
        accion: `Eliminó usuario ${row.correo}`,
        modulo: "Usuarios y seguridad",
        detalle: `Eliminó al usuario ${row.nombre} con rol ${row.rol}`,
        metadata: {
          id: row.id,
          nombre: row.nombre,
          correo: row.correo,
          rol: row.rol,
          estado: row.estado,
          permisos: row.permisos
        }
      });

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Usuario eliminado correctamente");
      return;
    }

    if (actionId === "toggle" || actionId === "suspend") {
      const estadoAnterior = row.estado;
      const estadoNuevo = row.estado === "Activo" ? "Suspendido" : "Activo";

      const updatedUser = await updateRow(row.id, {
        estado: estadoNuevo
      });

      if (!updatedUser) return;

      await safeAudit({
        accion: `${estadoNuevo === "Activo" ? "Activó" : "Suspendió"} usuario ${row.correo}`,
        modulo: "Usuarios y seguridad",
        detalle: `Cambió el estado del usuario ${row.nombre} de ${estadoAnterior} a ${estadoNuevo}`,
        metadata: {
          id: row.id,
          nombre: row.nombre,
          correo: row.correo,
          rol: row.rol,
          estadoAnterior,
          estadoNuevo
        }
      });

      showToast(`Usuario ${estadoNuevo.toLowerCase()} correctamente`);
      return;
    }

    if (actionId === "download") {
      const excelRows = [
        {
          ID: row.id,
          Nombre: row.nombre,
          Correo: row.correo,
          Rol: row.rol,
          Estado: row.estado,
          "Día de creación": formatDate(row.created_at),
          Permisos: row.permisos
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Usuario");
      XLSX.writeFile(workbook, `usuario-${row.id}.xlsx`);

      await safeAudit({
        accion: `Descargó usuario ${row.correo}`,
        modulo: "Usuarios y seguridad",
        detalle: `Exportó en Excel la información del usuario ${row.nombre}`,
        metadata: {
          id: row.id,
          nombre: row.nombre,
          correo: row.correo,
          rol: row.rol
        }
      });

      showToast("Excel descargado correctamente");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="admin-users-security-page">
      <section className="admin-users-security-hero">
        <div>
          <span className="admin-users-security-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗 </h2>
          <p>Aquí podrás registrar roles, permisos, sesiones y bitácora.</p>
        </div>

        <div className="admin-users-security-hero-actions">
          <button onClick={openCreate}>Nuevo usuario</button>
          <button onClick={downloadUsersExcel}>Exportar Excel</button>
        </div>
      </section>

      <section className="admin-users-security-toolbar">
        <label className="admin-users-security-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, correo, rol, estado o permisos..."
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

      <section className="admin-users-security-summary">
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

      <section className="admin-users-security-table-card">
        <div className="admin-users-security-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Usuarios y seguridad</h3>
          </div>

          <small>{loading ? "Cargando..." : `${filteredRows.length} resultados`}</small>
        </div>

        <div className="admin-users-security-table-wrap">
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
                      {column.key === "created_at" ? (
                        formatDateTime(row[column.key])
                      ) : [
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
                          className={`admin-users-security-badge ${badgeClass(
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
                    <div className="admin-users-security-row-actions">
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => runAction(action.id, row)}
                        >
                          {action.id === "suspend"
                            ? row.estado === "Activo"
                              ? "Suspender"
                              : "Activar"
                            : action.label}
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
                    className="admin-users-security-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="admin-users-security-empty"
                  >
                    Cargando usuarios desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="admin-users-security-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-users-security-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-users-security-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-users-security-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-users-security-eyebrow">Detalle</span>
            <h3>Información del registro</h3>

            <div className="admin-users-security-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>
                    {column.key === "created_at"
                      ? formatDate(modal.row[column.key])
                      : modal.row[column.key]}
                  </strong>
                </article>
              ))}
            </div>

            <div className="admin-users-security-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-users-security-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-users-security-modal admin-users-security-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-users-security-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-users-security-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-users-security-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "rol" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Administrador</option>
                      <option>Analista comercial</option>
                      <option>Gerente de importaciones</option>
                      <option>Usuario consulta</option>
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
                      <option>Activo</option>
                      <option>Suspendido</option>
                      <option>Inactivo</option>
                    </select>
                  ) : field === "permisos" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Total</option>
                      <option>Analítico</option>
                      <option>Aprobación</option>
                      <option>Solo lectura</option>
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

            <div className="admin-users-security-modal-actions">
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