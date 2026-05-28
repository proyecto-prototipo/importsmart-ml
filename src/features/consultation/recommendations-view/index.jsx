import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const initialRows = [
  {
    id: 1,
    producto: "Pastillas freno Accent",
    region: "Arequipa",
    cantidad: "3,500 uds",
    prioridad: "Alta",
    riesgo: "Bajo",
    margen: "41%",
    stock: "620 uds",
    capital: "US$ 63,000",
    estado: "Pendiente",
    fuente: "Recomendaciones publicadas",
    modeloVersion: "v2.4"
  },
  {
    id: 2,
    producto: "Kit embrague Hilux",
    region: "Lima",
    cantidad: "1,900 uds",
    prioridad: "Alta",
    riesgo: "Medio",
    margen: "34%",
    stock: "210 uds",
    capital: "US$ 155,800",
    estado: "Pendiente",
    fuente: "Recomendaciones publicadas",
    modeloVersion: "v2.4"
  },
  {
    id: 3,
    producto: "Amortiguador NP300",
    region: "La Libertad",
    cantidad: "1,100 uds",
    prioridad: "Media",
    riesgo: "Medio",
    margen: "26%",
    stock: "180 uds",
    capital: "US$ 39,600",
    estado: "En revisión",
    fuente: "Recomendaciones publicadas",
    modeloVersion: "v2.4"
  },
  {
    id: 4,
    producto: "Filtro aceite Corolla",
    region: "Lambayeque",
    cantidad: "1,300 uds",
    prioridad: "Media",
    riesgo: "Bajo",
    margen: "29%",
    stock: "900 uds",
    capital: "US$ 6,240",
    estado: "Aprobado",
    fuente: "Recomendaciones publicadas",
    modeloVersion: "v2.4"
  },
  {
    id: 5,
    producto: "Bomba de agua Spark",
    region: "Piura",
    cantidad: "240 uds",
    prioridad: "Baja",
    riesgo: "Alto",
    margen: "22%",
    stock: "470 uds",
    capital: "US$ 5,040",
    estado: "Rechazado",
    fuente: "Recomendaciones publicadas",
    modeloVersion: "v2.4"
  }
];

const columns = [
  {
    key: "producto",
    label: "Producto"
  },
  {
    key: "region",
    label: "Región"
  },
  {
    key: "cantidad",
    label: "Cantidad"
  },
  {
    key: "prioridad",
    label: "Prioridad"
  },
  {
    key: "riesgo",
    label: "Riesgo"
  },
  {
    key: "margen",
    label: "Margen"
  },
  {
    key: "estado",
    label: "Estado"
  }
];

const filterFields = ["region", "prioridad", "riesgo", "estado"];

const actions = [
  { id: "view", label: "Ver detalle" },
  { id: "download", label: "Descargar" }
];

const formFields = [
  "producto",
  "region",
  "cantidad",
  "prioridad",
  "riesgo",
  "margen",
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

function parseNumber(value) {
  const number = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-PE").format(value);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function priorityScore(value) {
  const text = normalize(value);

  if (text.includes("alta")) return 100;
  if (text.includes("media")) return 66;
  if (text.includes("baja")) return 35;

  return 20;
}

function riskScore(value) {
  const text = normalize(value);

  if (text.includes("alto")) return 100;
  if (text.includes("medio")) return 65;
  if (text.includes("bajo")) return 35;

  return 20;
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
    text.includes("sobrestock")
  ) {
    return "danger";
  }

  return "neutral";
}

function createBlankRow() {
  const row = { id: Date.now() };

  formFields.forEach((key) => {
    row[key] = "";
  });

  return row;
}

export default function ConsultationRecommendationsViewPage() {
  const [rows, setRows] = useState(initialRows);
  const [modelInfo, setModelInfo] = useState(null);
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

    const [recommendationsResult, modelResult] = await Promise.all([
      supabase
        .from("admin_recommendations_published")
        .select("*")
        .order("id", { ascending: true }),

      supabase
        .from("admin_model_admin")
        .select("*")
        .eq("estado", "Producción")
        .order("id", { ascending: true })
        .limit(1)
    ]);

    if (recommendationsResult.error) {
      console.error(
        "Error cargando recomendaciones publicadas:",
        recommendationsResult.error
      );
      showToast("No se pudieron cargar las recomendaciones");
      setRows(initialRows);
      setLoading(false);
      return;
    }

    if (modelResult.error) {
      console.error("Error cargando modelo productivo:", modelResult.error);
      setModelInfo(null);
    } else {
      setModelInfo(modelResult.data?.[0] ?? null);
    }

    setRows(
      (recommendationsResult.data ?? []).length > 0
        ? recommendationsResult.data
        : initialRows
    );

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
          `${row.producto ?? ""} ${row.region ?? ""} ${row.cantidad ?? ""} ${row.prioridad ?? ""} ${row.riesgo ?? ""} ${row.margen ?? ""} ${row.stock ?? ""} ${row.capital ?? ""} ${row.estado ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  const totalUnits = useMemo(() => {
    return rows.reduce((sum, row) => sum + parseNumber(row.cantidad), 0);
  }, [rows]);

  const totalCapital = useMemo(() => {
    return rows.reduce((sum, row) => sum + parseNumber(row.capital), 0);
  }, [rows]);

  const highPriorityCount = useMemo(() => {
    return rows.filter((row) => normalize(row.prioridad).includes("alta"))
      .length;
  }, [rows]);

  const approvedCount = useMemo(() => {
    return rows.filter((row) => normalize(row.estado).includes("aprob")).length;
  }, [rows]);

  const topRecommendation = useMemo(() => {
    return [...rows].sort(
      (a, b) => parseNumber(b.capital) - parseNumber(a.capital)
    )[0];
  }, [rows]);

  const capitalRanking = useMemo(() => {
    const max = Math.max(...rows.map((row) => parseNumber(row.capital)), 1);

    return [...rows]
      .sort((a, b) => parseNumber(b.capital) - parseNumber(a.capital))
      .slice(0, 5)
      .map((row) => ({
        label: row.producto,
        region: row.region,
        value: parseNumber(row.capital),
        percent: Math.round((parseNumber(row.capital) / max) * 100)
      }));
  }, [rows]);

  const stockVsRecommendation = useMemo(() => {
    return [...rows]
      .sort((a, b) => parseNumber(b.cantidad) - parseNumber(a.cantidad))
      .slice(0, 5)
      .map((row) => {
        const recommended = parseNumber(row.cantidad);
        const stock = parseNumber(row.stock);
        const max = Math.max(recommended, stock, 1);

        return {
          label: row.producto,
          recommended,
          stock,
          recommendedPercent: Math.round((recommended / max) * 100),
          stockPercent: Math.round((stock / max) * 100)
        };
      });
  }, [rows]);

  const priorityStats = useMemo(() => {
    const total = Math.max(rows.length, 1);

    const alta = rows.filter((row) => normalize(row.prioridad).includes("alta"))
      .length;

    const media = rows.filter((row) =>
      normalize(row.prioridad).includes("media")
    ).length;

    const baja = rows.filter((row) => normalize(row.prioridad).includes("baja"))
      .length;

    const altaPercent = Math.round((alta / total) * 100);
    const mediaPercent = Math.round((media / total) * 100);
    const bajaPercent = Math.max(0, 100 - altaPercent - mediaPercent);

    return {
      alta,
      media,
      baja,
      altaPercent,
      mediaPercent,
      bajaPercent,
      gradient: `conic-gradient(#16a34a 0 ${altaPercent}%, #f59e0b ${altaPercent}% ${
        altaPercent + mediaPercent
      }%, #94a3b8 ${altaPercent + mediaPercent}% 100%)`
    };
  }, [rows]);


  const riskStats = useMemo(() => {
  const total = Math.max(rows.length, 1);

  const bajo = rows.filter((row) => normalize(row.riesgo).includes("bajo"))
    .length;

  const medio = rows.filter((row) => normalize(row.riesgo).includes("medio"))
    .length;

  const alto = rows.filter((row) => normalize(row.riesgo).includes("alto"))
    .length;

  return [
    {
      label: "Bajo",
      value: bajo,
      percent: Math.round((bajo / total) * 100),
      className: "success"
    },
    {
      label: "Medio",
      value: medio,
      percent: Math.round((medio / total) * 100),
      className: "warning"
    },
    {
      label: "Alto",
      value: alto,
      percent: Math.round((alto / total) * 100),
      className: "danger"
    }
  ];
}, [rows]);

const statusStats = useMemo(() => {
  const estados = ["Pendiente", "En revisión", "Aprobado", "Rechazado"];

  return estados.map((estado) => ({
    label: estado,
    value: rows.filter((row) => normalize(row.estado).includes(normalize(estado)))
      .length
  }));
}, [rows]);

const stockGapRanking = useMemo(() => {
  return [...rows]
    .map((row) => {
      const suggested = parseNumber(row.cantidad);
      const stock = parseNumber(row.stock);
      const gap = suggested - stock;
      const max = Math.max(suggested, stock, 1);

      return {
        label: row.producto,
        region: row.region,
        suggested,
        stock,
        gap,
        suggestedPercent: Math.round((suggested / max) * 100),
        stockPercent: Math.round((stock / max) * 100)
      };
    })
    .sort((a, b) => Math.max(b.gap, 0) - Math.max(a.gap, 0));
}, [rows]);


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
      setRows((prev) =>
        prev.map((row) => (row.id === form.id ? form : row))
      );
      showToast("Cambios guardados correctamente");
    }

    setModal(null);
  }

  function updateRow(id, updates) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  }

  function runAction(actionId, row) {
    if (actionId === "view") {
      setModal({ type: "detail", row });
      return;
    }

    if (actionId === "edit") {
      openEdit(row);
      return;
    }

    if (actionId === "delete") {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Registro eliminado");
      return;
    }

    if (actionId === "approve") {
      updateRow(row.id, { estado: "Aprobado" });
      showToast("Aprobado correctamente");
      return;
    }

    if (actionId === "reject") {
      updateRow(row.id, { estado: "Rechazado" });
      showToast("Registro observado o rechazado");
      return;
    }

    if (actionId === "send") {
      updateRow(row.id, { estado: "En revisión" });
      showToast("Propuesta enviada a gerencia");
      return;
    }

    if (actionId === "validate") {
      updateRow(row.id, { estado: "Validado", errores: "0" });
      showToast("Validación simulada completada");
      return;
    }

    if (actionId === "clean") {
      updateRow(row.id, { estado: "Corregido", errores: "0" });
      showToast("Limpieza simulada ejecutada");
      return;
    }

    if (actionId === "read") {
      updateRow(row.id, { estado: "Leído" });
      showToast("Alerta marcada como leída");
      return;
    }

    if (actionId === "backup") {
      updateRow(row.id, { estado: "Respaldada" });
      showToast("Respaldo generado");
      return;
    }

    if (actionId === "deploy") {
      updateRow(row.id, { estado: "Producción" });
      showToast("Modelo publicado en producción");
      return;
    }

    if (actionId === "retrain") {
      setRows((prev) => [
        {
          ...row,
          id: Date.now(),
          version: "v" + (2 + Math.random()).toFixed(1),
          estado: "Pruebas"
        },
        ...prev
      ]);
      showToast("Reentrenamiento simulado generado");
      return;
    }

    if (actionId === "toggle") {
      updateRow(row.id, {
        estado: row.estado === "Activo" ? "Inactivo" : "Activo"
      });
      showToast("Estado actualizado");
      return;
    }

    if (actionId === "reorder") {
      updateRow(row.id, { sugerencia: "Orden de reposición creada" });
      showToast("Reposición sugerida");
      return;
    }

    if (actionId === "generate") {
      updateRow(row.id, { estado: "Listo" });
      showToast("Reporte generado");
      return;
    }

    if (actionId === "download") {
      downloadCsv("consultation-recommendations-view.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="consultation-recommendations-view-page">
      <section className="consultation-recommendations-view-hero">
        <div>
          <span className="consultation-recommendations-view-eyebrow">
            Usuario consulta
          </span>

          <h2>Bienvenid@ 🤗</h2>

          <p>
            Podrás revisar productos sugeridos para priorizar compras, evaluar capital
            estimado y tomar decisiones según margen, riesgo y stock disponible.
          </p>
        </div>

        <div className="consultation-recommendations-view-hero-actions">
          <button onClick={loadRows}>
            {loading ? "Actualizando..." : "Actualizar datos"}
          </button>

          <button
            onClick={() =>
              downloadCsv(
                "consultation-recommendations-view.csv",
                filteredRows
              )
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="consultation-recommendations-source-card">
        <div>
          <span>Recomendaciones activas</span>
          <h3>
            {modelInfo?.version
              ? `Publicadas desde modelo ${modelInfo.version}`
              : "Sugerencias comerciales publicadas"}
          </h3>
          <p>
            Información preparada para identificar qué productos conviene
            priorizar según demanda estimada, margen, riesgo, stock y capital
            requerido.
          </p>
        </div>

        <div className="consultation-recommendations-source-status">
          <article>
            <strong>{modelInfo?.algoritmo ?? "Análisis comercial"}</strong>
            <span>origen</span>
          </article>

          <article>
            <strong>{modelInfo?.precision ?? "Prioridad comercial"}</strong>
            <span>criterio</span>
          </article>

          <article>
            <strong>{modelInfo?.estado ?? "Publicado"}</strong>
            <span>estado</span>
          </article>
        </div>
      </section>

      <section className="consultation-recommendations-kpis">
        <article>
          <span>📦</span>
          <strong>{formatNumber(totalUnits)}</strong>
          <p>unidades sugeridas</p>
        </article>

        <article>
          <span>💵</span>
          <strong>{formatMoney(totalCapital)}</strong>
          <p>capital estimado</p>
        </article>

        <article>
          <span>🔥</span>
          <strong>{highPriorityCount}</strong>
          <p>prioridad alta</p>
        </article>

        <article>
          <span>✅</span>
          <strong>{approvedCount}</strong>
          <p>recomendaciones aprobadas</p>
        </article>
      </section>

      <section className="consultation-recommendations-view-toolbar">
        <label className="consultation-recommendations-view-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por producto, región, prioridad, riesgo o estado..."
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

      <section className="consultation-recommendations-view-summary">
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

      <section className="consultation-recommendations-analytics-grid consultation-recommendations-analytics-grid-pro">
        <article className="consultation-recommendations-chart-card consultation-capital-card">
          <div className="consultation-recommendations-chart-head">
            <span>Capital</span>
            <h3>Inversión recomendada</h3>
            <p>Ranking de productos con mayor capital estimado para priorizar compras.</p>
          </div>

          <div className="consultation-capital-highlight">
            <div>
              <span>Mayor oportunidad</span>
              <h4>{topRecommendation?.producto ?? "Sin datos"}</h4>
              <p>
                {topRecommendation?.region ?? "Sin región"} ·{" "}
                {topRecommendation?.cantidad ?? "0 uds"} sugeridas
              </p>
            </div>

            <strong>{topRecommendation?.capital ?? "US$ 0"}</strong>
          </div>

          <div className="consultation-recommendations-bars consultation-recommendations-bars-compact">
            {capitalRanking.map((row, index) => (
              <div className="consultation-recommendations-bar" key={row.label}>
                <div>
                  <strong>
                    <span>{index + 1}</span>
                    {row.label}
                  </strong>
                  <small>
                    {formatMoney(row.value)} · {row.region}
                  </small>
                </div>

                <span>
                  <i style={{ width: `${row.percent}%` }} />
                </span>
              </div>
            ))}
          </div>

          <div className="consultation-capital-mini-grid">
            <article>
              <span>Capital total</span>
              <strong>{formatMoney(totalCapital)}</strong>
            </article>

            <article>
              <span>Prioridad alta</span>
              <strong>{highPriorityCount}</strong>
            </article>
          </div>
        </article>

        <article className="consultation-recommendations-donut-card consultation-priority-card">
          <div className="consultation-recommendations-chart-head">
            <span>Prioridad</span>
            <h3>Distribución comercial</h3>
            <p>Clasificación de recomendaciones según urgencia de compra.</p>
          </div>

          <div className="consultation-priority-layout">
            <div
              className="consultation-recommendations-donut"
              style={{ background: priorityStats.gradient }}
            >
              <div>
                <strong>{rows.length}</strong>
                <span>registros</span>
              </div>
            </div>

            <div className="consultation-recommendations-donut-legend consultation-priority-legend">
              <article>
                <span className="alta" />
                <p>
                  Alta <strong>{priorityStats.alta}</strong>
                </p>
              </article>

              <article>
                <span className="media" />
                <p>
                  Media <strong>{priorityStats.media}</strong>
                </p>
              </article>

              <article>
                <span className="baja" />
                <p>
                  Baja <strong>{priorityStats.baja}</strong>
                </p>
              </article>
            </div>
          </div>

          <div className="consultation-risk-breakdown">
            {riskStats.map((item) => (
              <article key={item.label}>
                <div>
                  <span className={item.className}>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>

                <p>
                  <i
                    className={item.className}
                    style={{ width: `${item.percent}%` }}
                  />
                </p>
              </article>
            ))}
          </div>

          <div className="consultation-status-pills">
            {statusStats.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </article>

        <article className="consultation-recommendations-chart-card consultation-stock-card">
          <div className="consultation-recommendations-chart-head">
            <span>Stock vs sugerencia</span>
            <h3>Brecha de reposición</h3>
            <p>Compara la cantidad recomendada contra el stock disponible.</p>
          </div>

          <div className="consultation-stock-gap-list">
            {stockGapRanking.map((row) => (
              <article className="consultation-stock-gap-item" key={row.label}>
                <div className="consultation-stock-gap-head">
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.region}</small>
                  </div>

                  <span className={row.gap > 0 ? "warning" : "success"}>
                    {row.gap > 0
                      ? `Faltan ${formatNumber(row.gap)} uds`
                      : "Stock suficiente"}
                  </span>
                </div>

                <div className="consultation-stock-gap-bars">
                  <div>
                    <small>Sugerido: {formatNumber(row.suggested)} uds</small>
                    <p>
                      <i
                        className="recommended"
                        style={{ width: `${row.suggestedPercent}%` }}
                      />
                    </p>
                  </div>

                  <div>
                    <small>Stock: {formatNumber(row.stock)} uds</small>
                    <p>
                      <i
                        className="stock"
                        style={{ width: `${row.stockPercent}%` }}
                      />
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>



      <section className="consultation-recommendations-view-table-card">
        <div className="consultation-recommendations-view-table-head">
          <div>
            <span>Vista operativa</span>
            <h3>Recomendaciones publicadas</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} resultados`}
          </small>
        </div>

        <div className="consultation-recommendations-view-table-wrap">
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
                          className={`consultation-recommendations-view-badge ${badgeClass(
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
                    <div className="consultation-recommendations-view-row-actions">
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
                    className="consultation-recommendations-view-empty"
                  >
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="consultation-recommendations-view-empty"
                  >
                    Cargando recomendaciones desde Supabase...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="consultation-recommendations-view-toast">{toast}</div>
      )}

      {modal?.type === "detail" && (
        <div
          className="consultation-recommendations-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-recommendations-view-modal consultation-recommendations-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="consultation-recommendations-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-recommendations-view-eyebrow">
              Detalle de recomendación
            </span>

            <h3>{modal.row.producto}</h3>

            <p className="consultation-recommendations-detail-subtitle">
              {modal.row.region} · Prioridad {modal.row.prioridad} · Riesgo{" "}
              {modal.row.riesgo}
            </p>

            <div className="consultation-recommendations-view-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}

              <article>
                <span>Stock actual</span>
                <strong>{modal.row.stock ?? "No registrado"}</strong>
              </article>

              <article>
                <span>Capital estimado</span>
                <strong>{modal.row.capital ?? "No registrado"}</strong>
              </article>

              <article>
                <span>Modelo</span>
                <strong>
                  {modal.row.modeloVersion ?? modelInfo?.version ?? "v2.4"}
                </strong>
              </article>

              <article>
                <span>Fuente</span>
                <strong>
                  {modal.row.fuente ?? "Recomendaciones publicadas"}
                </strong>
              </article>
            </div>

            <div className="consultation-recommendations-score-card">
              <article>
                <span>Prioridad</span>
                <div>
                  <i
                    style={{
                      width: `${priorityScore(modal.row.prioridad)}%`
                    }}
                  />
                </div>
              </article>

              <article>
                <span>Riesgo</span>
                <div>
                  <i
                    className="risk"
                    style={{
                      width: `${riskScore(modal.row.riesgo)}%`
                    }}
                  />
                </div>
              </article>
            </div>

            <div className="consultation-recommendations-insight">
              <strong>Análisis rápido</strong>
              <p>
                Se recomienda evaluar{" "}
                <strong>{modal.row.cantidad}</strong> de{" "}
                <strong>{modal.row.producto}</strong> para{" "}
                <strong>{modal.row.region}</strong>. El margen estimado es de{" "}
                <strong>{modal.row.margen}</strong>, con riesgo{" "}
                <strong>{modal.row.riesgo}</strong> y capital requerido de{" "}
                <strong>{modal.row.capital}</strong>.
              </p>
            </div>

            <div className="consultation-recommendations-view-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="consultation-recommendations-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="consultation-recommendations-view-modal consultation-recommendations-view-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="consultation-recommendations-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-recommendations-view-eyebrow">
              Formulario
            </span>

            <h3>{modal.title}</h3>

            <div className="consultation-recommendations-view-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}
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
                </label>
              ))}
            </div>

            <div className="consultation-recommendations-view-modal-actions">
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