import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const fallbackCatalog = [
  {
    id: 1,
    codigo: "SP-001",
    repuesto: "Kit embrague Hilux",
    categoria: "Transmisión",
    marca: "Toyota",
    modelo: "Hilux",
    region: "Lima",
    rotacion: "Alta",
    estado: "Activo"
  },
  {
    id: 2,
    codigo: "SP-002",
    repuesto: "Pastillas freno Accent",
    categoria: "Frenos",
    marca: "Hyundai",
    modelo: "Accent",
    region: "Arequipa",
    rotacion: "Alta",
    estado: "Activo"
  },
  {
    id: 3,
    codigo: "SP-003",
    repuesto: "Filtro aceite Corolla",
    categoria: "Motor",
    marca: "Toyota",
    modelo: "Corolla",
    region: "Lambayeque",
    rotacion: "Media",
    estado: "Activo"
  }
];

const fallbackVehicleFleet = [
  {
    id: 1,
    region: "Lima",
    marca: "Toyota",
    modelo: "Hilux",
    tipo: "Pick-up",
    unidades: "18,420",
    crecimiento: "12.5%",
    concentracion: "Alta"
  },
  {
    id: 2,
    region: "Arequipa",
    marca: "Hyundai",
    modelo: "Accent",
    tipo: "Sedán",
    unidades: "9,860",
    crecimiento: "8.1%",
    concentracion: "Media"
  },
  {
    id: 3,
    region: "La Libertad",
    marca: "Nissan",
    modelo: "NP300",
    tipo: "Pick-up",
    unidades: "7,420",
    crecimiento: "10.2%",
    concentracion: "Alta"
  }
];

const fallbackSales = [
  {
    id: 1,
    producto: "Kit embrague Hilux",
    region: "Lima",
    periodo: "2026-Q1",
    unidades: "1,248",
    margen: "34%",
    rotacion: "Alta"
  },
  {
    id: 2,
    producto: "Pastillas freno Accent",
    region: "Arequipa",
    periodo: "2026-Q1",
    unidades: "2,804",
    margen: "41%",
    rotacion: "Alta"
  },
  {
    id: 3,
    producto: "Filtro aceite Corolla",
    region: "Lambayeque",
    periodo: "2026-Q1",
    unidades: "1,402",
    margen: "29%",
    rotacion: "Media"
  }
];

const fallbackForecasts = [
  {
    id: 1,
    producto: "Kit embrague Hilux",
    region: "Lima",
    periodo: "Jun-Ago 2026",
    demanda: "1,620 uds",
    confianza: "91%",
    probabilidad: "Alta",
    tendencia: "Creciente"
  },
  {
    id: 2,
    producto: "Pastillas freno Accent",
    region: "Arequipa",
    periodo: "Jun-Ago 2026",
    demanda: "3,150 uds",
    confianza: "88%",
    probabilidad: "Alta",
    tendencia: "Creciente"
  },
  {
    id: 3,
    producto: "Filtro aceite Corolla",
    region: "Lambayeque",
    periodo: "Jun-Ago 2026",
    demanda: "1,180 uds",
    confianza: "81%",
    probabilidad: "Media",
    tendencia: "Estable"
  }
];

const fallbackRecommendations = [
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
    estado: "Pendiente"
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
    estado: "Pendiente"
  },
  {
    id: 3,
    producto: "Filtro aceite Corolla",
    region: "Lambayeque",
    cantidad: "1,300 uds",
    prioridad: "Media",
    riesgo: "Bajo",
    margen: "29%",
    stock: "900 uds",
    capital: "US$ 6,240",
    estado: "Aprobado"
  }
];

const fallbackReports = [
  {
    id: 1,
    reporte: "Resumen de productos recomendados",
    tipo: "Comercial",
    periodo: "Mayo 2026",
    estado: "Listo",
    modulo_origen: "Recomendaciones publicadas"
  },
  {
    id: 2,
    reporte: "Demanda proyectada por región",
    tipo: "Analítico",
    periodo: "Q2 2026",
    estado: "Listo",
    modulo_origen: "Forecasting publicado"
  },
  {
    id: 3,
    reporte: "Ventas históricas consultadas",
    tipo: "Histórico",
    periodo: "2026-Q1",
    estado: "Listo",
    modulo_origen: "Ventas históricas"
  }
];

const fallbackEvents = [
  {
    id: 1,
    titulo: "Catálogo actualizado",
    descripcion: "Productos visibles para consulta.",
    modulo: "Catálogo de repuestos",
    tipo: "Actualización",
    region: "Todas",
    periodo: "Mayo 2026",
    estado: "Activo",
    fecha: "2026-05-21 09:15"
  },
  {
    id: 2,
    titulo: "Forecast publicado",
    descripcion: "Predicciones disponibles para Jun-Ago 2026.",
    modulo: "Forecasting publicado",
    tipo: "Publicación",
    region: "Todas",
    periodo: "Jun-Ago 2026",
    estado: "Activo",
    fecha: "2026-05-21 10:30"
  },
  {
    id: 3,
    titulo: "Reporte disponible",
    descripcion: "Reporte de demanda por región listo para descarga.",
    modulo: "Reportes básicos",
    tipo: "Reporte",
    region: "Todas",
    periodo: "Q2 2026",
    estado: "Activo",
    fecha: "2026-05-21 11:10"
  }
];

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

function formatPercent(value) {
  const number = parseNumber(value);
  return Number.isFinite(number) ? `${number}%` : "0%";
}

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function isActive(row) {
  const estado = normalize(row.estado);

  return !estado || estado.includes("activo") || estado.includes("listo");
}

function buildDonut(items, colorMap) {
  const total = Math.max(
    items.reduce((sum, item) => sum + item.value, 0),
    1
  );

  let current = 0;

  const segments = items.map((item) => {
    const start = current;
    const percent = Math.round((item.value / total) * 100);
    const end = current + percent;

    current = end;

    return `${colorMap[item.label] ?? "#94a3b8"} ${start}% ${end}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

export default function ConsultationDashboardPage() {
  const [catalogRows, setCatalogRows] = useState(fallbackCatalog);
  const [vehicleRows, setVehicleRows] = useState(fallbackVehicleFleet);
  const [salesRows, setSalesRows] = useState(fallbackSales);
  const [forecastRows, setForecastRows] = useState(fallbackForecasts);
  const [recommendationRows, setRecommendationRows] = useState(
    fallbackRecommendations
  );
  const [reportRows, setReportRows] = useState(fallbackReports);
  const [eventRows, setEventRows] = useState(fallbackEvents);

  const [region, setRegion] = useState("Todas");
  const [period, setPeriod] = useState("Todos");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function readTable(label, request, fallback) {
    const { data, error } = await request;

    if (error) {
      console.warn(`No se pudo cargar ${label}:`, error);
      return fallback;
    }

    return (data ?? []).length > 0 ? data : fallback;
  }

  async function loadDashboardData() {
    setLoading(true);

    const [
      catalog,
      vehicles,
      sales,
      forecasts,
      recommendations,
      reports,
      events
    ] = await Promise.all([
      readTable(
        "catálogo",
        supabase
          .from("admin_catalog_parts")
          .select("*")
          .order("id", { ascending: true }),
        fallbackCatalog
      ),
      readTable(
        "parque automotor",
        supabase
          .from("admin_vehicle_fleet")
          .select("*")
          .order("id", { ascending: true }),
        fallbackVehicleFleet
      ),
      readTable(
        "ventas históricas",
        supabase
          .from("consultation_sales_history_view")
          .select("*")
          .order("id", { ascending: true }),
        fallbackSales
      ),
      readTable(
        "forecasting",
        supabase
          .from("consultation_forecast_view")
          .select("*")
          .order("id", { ascending: true }),
        fallbackForecasts
      ),
      readTable(
        "recomendaciones",
        supabase
          .from("admin_recommendations_published")
          .select("*")
          .order("id", { ascending: true }),
        fallbackRecommendations
      ),
      readTable(
        "reportes",
        supabase
          .from("consultation_reports_view")
          .select("*")
          .order("id", { ascending: true }),
        fallbackReports
      ),
      readTable(
        "eventos dashboard consulta",
        supabase
          .from("consultation_dashboard_events")
          .select("*")
          .order("fecha", { ascending: false })
          .limit(8),
        fallbackEvents
      )
    ]);

    setCatalogRows(catalog);
    setVehicleRows(vehicles);
    setSalesRows(sales);
    setForecastRows(forecasts);
    setRecommendationRows(recommendations);
    setReportRows(reports);
    setEventRows(events);

    setLoading(false);
    showToast("Dashboard actualizado");
  }

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  const regionOptions = useMemo(() => {
    const values = [
      ...catalogRows.map((row) => row.region),
      ...vehicleRows.map((row) => row.region),
      ...salesRows.map((row) => row.region),
      ...forecastRows.map((row) => row.region),
      ...recommendationRows.map((row) => row.region)
    ].filter(Boolean);

    return ["Todas", ...new Set(values)];
  }, [catalogRows, vehicleRows, salesRows, forecastRows, recommendationRows]);

  const periodOptions = useMemo(() => {
    const values = [
      ...salesRows.map((row) => row.periodo),
      ...forecastRows.map((row) => row.periodo),
      ...reportRows.map((row) => row.periodo),
      ...eventRows.map((row) => row.periodo)
    ].filter(Boolean);

    return ["Todos", ...new Set(values)];
  }, [salesRows, forecastRows, reportRows, eventRows]);

  function matchesRegion(row) {
    return region === "Todas" || row.region === region || row.region === "Todas";
  }

  function matchesPeriod(row) {
    return period === "Todos" || row.periodo === period;
  }

  const visibleCatalog = useMemo(() => {
    return catalogRows.filter((row) => isActive(row) && matchesRegion(row));
  }, [catalogRows, region]);

  const visibleVehicles = useMemo(() => {
    return vehicleRows.filter((row) => matchesRegion(row));
  }, [vehicleRows, region]);

  const visibleSales = useMemo(() => {
    return salesRows.filter((row) => matchesRegion(row) && matchesPeriod(row));
  }, [salesRows, region, period]);

  const visibleForecasts = useMemo(() => {
    return forecastRows.filter(
      (row) => matchesRegion(row) && matchesPeriod(row)
    );
  }, [forecastRows, region, period]);

  const visibleRecommendations = useMemo(() => {
    return recommendationRows.filter((row) => matchesRegion(row));
  }, [recommendationRows, region]);

  const visibleReports = useMemo(() => {
    return reportRows.filter(
      (row) =>
        matchesPeriod(row) &&
        (normalize(row.estado).includes("listo") ||
          normalize(row.estado).includes("publicado"))
    );
  }, [reportRows, period]);

  const summary = useMemo(() => `${region} · ${period}`, [region, period]);

  const uniqueRegionsCount = useMemo(() => {
    return new Set(
      [
        ...catalogRows.map((row) => row.region),
        ...vehicleRows.map((row) => row.region),
        ...forecastRows.map((row) => row.region)
      ].filter(Boolean)
    ).size;
  }, [catalogRows, vehicleRows, forecastRows]);

  const metrics = useMemo(() => {
    return [
      {
        label: "Productos visibles",
        value: visibleCatalog.length,
        hint: "Catálogo autorizado",
        icon: "🧩"
      },
      {
        label: "Regiones",
        value: uniqueRegionsCount,
        hint: "Cobertura disponible",
        icon: "🗺️"
      },
      {
        label: "Forecasts publicados",
        value: visibleForecasts.length,
        hint: "Predicciones activas",
        icon: "🧠"
      },
      {
        label: "Reportes listos",
        value: visibleReports.length,
        hint: "Descarga permitida",
        icon: "📄"
      }
    ];
  }, [visibleCatalog, uniqueRegionsCount, visibleForecasts, visibleReports]);

  const demandByCategory = useMemo(() => {
    const map = new Map();

    visibleForecasts.forEach((forecast) => {
      const product = normalize(forecast.producto);
      const catalog = catalogRows.find((item) =>
        normalize(item.repuesto).includes(product)
      );

      const category = catalog?.categoria ?? "Sin categoría";
      const current = map.get(category) ?? 0;

      map.set(category, current + parseNumber(forecast.demanda));
    });

    if (map.size === 0) {
      visibleCatalog.forEach((item) => {
        const category = item.categoria ?? "Sin categoría";
        const current = map.get(category) ?? 0;
        map.set(category, current + 1);
      });
    }

    const max = Math.max(...Array.from(map.values()), 1);

    return Array.from(map.entries())
      .map(([label, value]) => ({
        label,
        value,
        percent: Math.round((value / max) * 100)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [visibleForecasts, visibleCatalog, catalogRows]);

  const regionalDemand = useMemo(() => {
    const map = new Map();

    visibleForecasts.forEach((row) => {
      const current = map.get(row.region) ?? 0;
      map.set(row.region, current + parseNumber(row.demanda));
    });

    if (map.size === 0) {
      visibleVehicles.forEach((row) => {
        const current = map.get(row.region) ?? 0;
        map.set(row.region, current + parseNumber(row.unidades));
      });
    }

    const max = Math.max(...Array.from(map.values()), 1);

    return Array.from(map.entries())
      .map(([label, value]) => ({
        label,
        value,
        percent: Math.round((value / max) * 100)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [visibleForecasts, visibleVehicles]);

  const salesTrend = useMemo(() => {
    const map = new Map();

    visibleSales.forEach((row) => {
      const key = row.periodo ?? "Sin periodo";
      const current = map.get(key) ?? 0;
      map.set(key, current + parseNumber(row.unidades));
    });

    if (map.size === 0) {
      visibleForecasts.forEach((row) => {
        const key = row.periodo ?? "Sin periodo";
        const current = map.get(key) ?? 0;
        map.set(key, current + parseNumber(row.demanda));
      });
    }

    const rows = Array.from(map.entries()).map(([label, value]) => ({
      label,
      value
    }));

    const max = Math.max(...rows.map((row) => row.value), 1);
    const min = Math.min(...rows.map((row) => row.value), 0);
    const width = 520;
    const height = 210;
    const padding = 28;

    const points = rows.map((row, index) => {
      const x =
        rows.length === 1
          ? width / 2
          : padding +
            (index * (width - padding * 2)) / Math.max(rows.length - 1, 1);

      const y =
        height -
        padding -
        ((row.value - min) / Math.max(max - min, 1)) * (height - padding * 2);

      return {
        ...row,
        x,
        y
      };
    });

    return {
      rows,
      points,
      path: points.map((point) => `${point.x},${point.y}`).join(" "),
      max
    };
  }, [visibleSales, visibleForecasts]);

  const probabilityStats = useMemo(() => {
    const alta = visibleForecasts.filter((row) =>
      normalize(row.probabilidad).includes("alta")
    ).length;

    const media = visibleForecasts.filter((row) =>
      normalize(row.probabilidad).includes("media")
    ).length;

    const baja = visibleForecasts.filter((row) =>
      normalize(row.probabilidad).includes("baja")
    ).length;

    const items = [
      { label: "Alta", value: alta },
      { label: "Media", value: media },
      { label: "Baja", value: baja }
    ];

    return {
      items,
      gradient: buildDonut(items, {
        Alta: "#16a34a",
        Media: "#f59e0b",
        Baja: "#94a3b8"
      })
    };
  }, [visibleForecasts]);

  const riskStats = useMemo(() => {
    const bajo = visibleRecommendations.filter((row) =>
      normalize(row.riesgo).includes("bajo")
    ).length;

    const medio = visibleRecommendations.filter((row) =>
      normalize(row.riesgo).includes("medio")
    ).length;

    const alto = visibleRecommendations.filter((row) =>
      normalize(row.riesgo).includes("alto")
    ).length;

    const items = [
      { label: "Bajo", value: bajo },
      { label: "Medio", value: medio },
      { label: "Alto", value: alto }
    ];

    return {
      items,
      gradient: buildDonut(items, {
        Bajo: "#16a34a",
        Medio: "#f59e0b",
        Alto: "#ef4444"
      })
    };
  }, [visibleRecommendations]);

  const vehicleRanking = useMemo(() => {
    const max = Math.max(...visibleVehicles.map((row) => parseNumber(row.unidades)), 1);

    return [...visibleVehicles]
      .sort((a, b) => parseNumber(b.unidades) - parseNumber(a.unidades))
      .slice(0, 6)
      .map((row) => ({
        label: `${row.marca ?? ""} ${row.modelo ?? ""}`.trim(),
        region: row.region,
        value: parseNumber(row.unidades),
        percent: Math.round((parseNumber(row.unidades) / max) * 100)
      }));
  }, [visibleVehicles]);

  const reportTypeStats = useMemo(() => {
    const map = new Map();

    visibleReports.forEach((row) => {
      const key = row.tipo ?? "Sin tipo";
      const current = map.get(key) ?? 0;
      map.set(key, current + 1);
    });

    const max = Math.max(...Array.from(map.values()), 1);

    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      percent: Math.round((value / max) * 100)
    }));
  }, [visibleReports]);

  const topRecommendation = useMemo(() => {
    return [...visibleRecommendations].sort(
      (a, b) => parseNumber(b.capital) - parseNumber(a.capital)
    )[0];
  }, [visibleRecommendations]);

  return (
    <main className="consultation-dashboard-page">
      <section className="consultation-dashboard-hero">
        <div>
          <span className="consultation-dashboard-eyebrow">
            Usuario consulta
          </span>

          <h2>Bienvenid@ 🤗</h2>

          <p>
            Revisa productos visibles, demanda proyectada, reportes disponibles
            y recomendaciones comerciales publicadas para tomar mejores
            decisiones.
          </p>
        </div>

        <div className="consultation-dashboard-filters">
          <label>
            Región
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              {regionOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Periodo
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {periodOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <button onClick={loadDashboardData}>
            {loading ? "Actualizando..." : "Actualizar dashboard"}
          </button>

          <button onClick={() => setModal("resumen")}>Ver resumen</button>
        </div>
      </section>

      <section className="consultation-dashboard-metrics">
        {metrics.map((item) => (
          <article key={item.label}>
            <span>{item.icon}</span>
            <strong>{formatNumber(item.value)}</strong>
            <h3>{item.label}</h3>
            <p>{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="consultation-dashboard-highlight-grid">
        <article className="consultation-dashboard-highlight-card">
          <span>Mayor oportunidad</span>
          <h3>{topRecommendation?.producto ?? "Sin recomendaciones"}</h3>
          <p>
            {topRecommendation?.region ?? "Sin región"} ·{" "}
            {topRecommendation?.cantidad ?? "0 uds"} sugeridas · riesgo{" "}
            {topRecommendation?.riesgo ?? "No definido"}
          </p>
          <strong>{topRecommendation?.capital ?? "US$ 0"}</strong>
        </article>

        <article className="consultation-dashboard-mini-card">
          <span>Catálogo activo</span>
          <strong>{formatNumber(visibleCatalog.length)}</strong>
          <p>productos listos para consulta</p>
        </article>

        <article className="consultation-dashboard-mini-card">
          <span>Vehículos analizados</span>
          <strong>
            {formatNumber(
              visibleVehicles.reduce(
                (sum, row) => sum + parseNumber(row.unidades),
                0
              )
            )}
          </strong>
          <p>unidades del parque automotor</p>
        </article>
      </section>

      <section className="consultation-dashboard-chart-grid">
        <article className="consultation-dashboard-panel consultation-dashboard-line-card">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Gráfico lineal</span>
              <h3>Tendencia de ventas y demanda</h3>
            </div>
            <button onClick={() => setModal("linea")}>Detalle</button>
          </div>

          <div className="consultation-dashboard-line-chart">
            <svg viewBox="0 0 520 210" role="img">
              <defs>
                <linearGradient id="consultationLineGradient" x1="0" x2="1">
                  <stop offset="0%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>

              <polyline
                points={salesTrend.path}
                fill="none"
                stroke="url(#consultationLineGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {salesTrend.points.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} r="6" />
                  <text x={point.x} y="198" textAnchor="middle">
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </article>

        <article className="consultation-dashboard-panel">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Gráfico de barras</span>
              <h3>Demanda por categoría</h3>
            </div>
            <button onClick={() => setModal("categoria")}>Ampliar</button>
          </div>

          <div className="consultation-dashboard-bars">
            {demandByCategory.map((row) => (
              <div className="consultation-dashboard-bar" key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <small>{formatNumber(row.value)}</small>
                </div>
                <span>
                  <i style={{ width: `${row.percent}%` }} />
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="consultation-dashboard-panel consultation-dashboard-donut-panel">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Gráfico circular</span>
              <h3>Probabilidad del forecast</h3>
            </div>
          </div>

          <div className="consultation-dashboard-donut-layout">
            <div
              className="consultation-dashboard-donut"
              style={{ background: probabilityStats.gradient }}
            >
              <div>
                <strong>{visibleForecasts.length}</strong>
                <span>forecasts</span>
              </div>
            </div>

            <div className="consultation-dashboard-legend">
              {probabilityStats.items.map((item) => (
                <article key={item.label}>
                  <span className={normalize(item.label)} />
                  <p>
                    {item.label} <strong>{item.value}</strong>
                  </p>
                </article>
              ))}
            </div>
          </div>
        </article>

        <article className="consultation-dashboard-panel consultation-dashboard-donut-panel">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Riesgo comercial</span>
              <h3>Recomendaciones publicadas</h3>
            </div>
          </div>

          <div className="consultation-dashboard-donut-layout">
            <div
              className="consultation-dashboard-donut"
              style={{ background: riskStats.gradient }}
            >
              <div>
                <strong>{visibleRecommendations.length}</strong>
                <span>items</span>
              </div>
            </div>

            <div className="consultation-dashboard-legend">
              {riskStats.items.map((item) => (
                <article key={item.label}>
                  <span className={normalize(item.label)} />
                  <p>
                    {item.label} <strong>{item.value}</strong>
                  </p>
                </article>
              ))}
            </div>
          </div>
        </article>

        <article className="consultation-dashboard-panel">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Regiones</span>
              <h3>Demanda regional</h3>
            </div>
          </div>

          <div className="consultation-dashboard-region-list">
            {regionalDemand.map((row) => (
              <article key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <small>{formatNumber(row.value)}</small>
                </div>
                <p>
                  <i style={{ width: `${row.percent}%` }} />
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="consultation-dashboard-panel">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Parque automotor</span>
              <h3>Modelos con mayor presencia</h3>
            </div>
          </div>

          <div className="consultation-dashboard-vehicle-list">
            {vehicleRanking.map((row) => (
              <article key={`${row.label}-${row.region}`}>
                <div>
                  <strong>{row.label}</strong>
                  <small>{row.region}</small>
                </div>
                <span>{formatNumber(row.value)}</span>
                <p>
                  <i style={{ width: `${row.percent}%` }} />
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="consultation-dashboard-panel">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Reportes</span>
              <h3>Reportes por tipo</h3>
            </div>
          </div>

          <div className="consultation-dashboard-report-list">
            {reportTypeStats.map((row) => (
              <article key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <small>{row.value} reporte(s)</small>
                </div>
                <p>
                  <i style={{ width: `${row.percent}%` }} />
                </p>
              </article>
            ))}

            {reportTypeStats.length === 0 && (
              <article>
                <strong>Sin reportes</strong>
                <small>No hay reportes disponibles.</small>
              </article>
            )}
          </div>
        </article>

        <article className="consultation-dashboard-panel">
          <div className="consultation-dashboard-panel-head">
            <div>
              <span>Actividad</span>
              <h3>Últimos movimientos</h3>
            </div>
            <button onClick={() => setModal("actividad")}>Detalle</button>
          </div>

          <ul className="consultation-dashboard-timeline">
            {eventRows.map((item, index) => (
              <li key={item.id ?? item.titulo}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item.titulo}</strong>
                  <p>{item.descripcion}</p>
                  <small>
                    {item.modulo} · {formatDate(item.fecha)}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {toast && <div className="consultation-dashboard-toast">{toast}</div>}

      {modal && (
        <div
          className="consultation-dashboard-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-dashboard-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="consultation-dashboard-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="consultation-dashboard-eyebrow">
              Ventana rápida
            </span>

            <h3>
              {modal === "resumen"
                ? "Resumen filtrado"
                : modal === "actividad"
                ? "Detalle de actividad"
                : "Detalle del gráfico"}
            </h3>

            <p>
              Vista generada para <strong>{summary}</strong>. Los indicadores se
              calculan desde los módulos de catálogo, parque automotor, ventas,
              forecasting, recomendaciones y reportes básicos.
            </p>

            <div className="consultation-dashboard-modal-summary">
              <article>
                <span>Productos</span>
                <strong>{visibleCatalog.length}</strong>
              </article>
              <article>
                <span>Forecasts</span>
                <strong>{visibleForecasts.length}</strong>
              </article>
              <article>
                <span>Reportes</span>
                <strong>{visibleReports.length}</strong>
              </article>
            </div>

            <div className="consultation-dashboard-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
              <button onClick={loadDashboardData}>Actualizar datos</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}