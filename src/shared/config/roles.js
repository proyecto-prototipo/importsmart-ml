export const roles = {
  "admin": {
    "id": "admin",
    "label": "Administrador",
    "email": "admin@soonest.pe",
    "password": "admin123",
    "accent": "#2563eb",
    "icon": "🛡️",
    "description": "Control total de seguridad, datos, catálogo, reportes, alertas y modelos ML.",
    "modules": [
      {
        "id": "dashboard",
        "title": "Dashboard administrativo",
        "description": "Resumen general del sistema",
        "icon": "🏠"
      },
      {
        "id": "users-security",
        "title": "Usuarios y seguridad",
        "description": "Roles, permisos, sesiones y bitácora",
        "icon": "👥"
      },
      {
        "id": "data-integration",
        "title": "Integración de datos",
        "description": "Carga, validación y fuentes de información",
        "icon": "📥"
      },
      {
        "id": "data-storage",
        "title": "Almacenamiento de datos",
        "description": "Tablas maestras, repositorios y respaldos",
        "icon": "🗄️"
      },
      {
        "id": "data-quality",
        "title": "Calidad de datos",
        "description": "Limpieza, homologación y preparación",
        "icon": "🧹"
      },
      {
        "id": "catalog",
        "title": "Catálogo maestro",
        "description": "Gestión de repuestos y compatibilidades",
        "icon": "🧩"
      },
      {
        "id": "alerts",
        "title": "Alertas y notificaciones",
        "description": "Configuración y seguimiento de avisos",
        "icon": "🔔"
      },
      {
        "id": "reports",
        "title": "Reportes generales",
        "description": "Reportes básicos y gerenciales",
        "icon": "📄"
      },
      {
        "id": "model-admin",
        "title": "Administración de modelos ML",
        "description": "Versionado, métricas y reentrenamiento",
        "icon": "🤖"
      },
      {
        "id": "audit-log",
        "title": "Bitácora y auditoría",
        "description": "Historial de accesos y cambios",
        "icon": "📋"
      }
    ]
  },
  "analyst": {
    "id": "analyst",
    "label": "Analista comercial",
    "email": "analista@soonest.pe",
    "password": "demo123",
    "accent": "#0891b2",
    "icon": "📈",
    "description": "Análisis de datos, ventas, parque automotor, forecasting y propuestas de importación.",
    "modules": [
      {
        "id": "dashboard",
        "title": "Dashboard analítico",
        "description": "Indicadores de demanda, ventas y datos",
        "icon": "🏠"
      },
      {
        "id": "data-upload",
        "title": "Carga de datos",
        "description": "Carga de ventas, parque automotor y catálogos",
        "icon": "📤"
      },
      {
        "id": "data-quality",
        "title": "Calidad de datos",
        "description": "Corrección de duplicados, nulos y homologaciones",
        "icon": "🧹"
      },
      {
        "id": "catalog-analysis",
        "title": "Análisis de catálogo",
        "description": "Rotación, compatibilidad y familias de productos",
        "icon": "🧩"
      },
      {
        "id": "automotive-park",
        "title": "Parque automotor",
        "description": "Segmentación regional de marcas, modelos y años",
        "icon": "🚗"
      },
      {
        "id": "sales-history",
        "title": "Ventas históricas",
        "description": "Patrones de venta, margen y rotación",
        "icon": "💳"
      },
      {
        "id": "demand-forecast",
        "title": "Forecasting de demanda",
        "description": "Pronósticos por producto, región y período",
        "icon": "🧠"
      },
      {
        "id": "import-recommendations",
        "title": "Propuestas de importación",
        "description": "Recomendaciones preliminares para gerencia",
        "icon": "✨"
      },
      {
        "id": "bi-dashboard",
        "title": "Dashboard BI",
        "description": "Gráficos, semáforos y filtros analíticos",
        "icon": "📊"
      },
      {
        "id": "reports",
        "title": "Reportes analíticos",
        "description": "Informes para revisión interna",
        "icon": "📄"
      }
    ]
  },
  "manager": {
    "id": "manager",
    "label": "Gerente de importaciones",
    "email": "gerente@soonest.pe",
    "password": "demo123",
    "accent": "#7c3aed",
    "icon": "🚢",
    "description": "Decisión ejecutiva sobre importación, abastecimiento, logística, alertas y reportes gerenciales.",
    "modules": [
      {
        "id": "dashboard",
        "title": "Dashboard ejecutivo",
        "description": "Indicadores para toma de decisión",
        "icon": "🏠"
      },
      {
        "id": "import-recommendations",
        "title": "Aprobación de importaciones",
        "description": "Aprobar, rechazar y priorizar productos",
        "icon": "✨"
      },
      {
        "id": "forecast-review",
        "title": "Revisión de demanda",
        "description": "Validación ejecutiva de pronósticos",
        "icon": "🧠"
      },
      {
        "id": "inventory",
        "title": "Inventario y abastecimiento",
        "description": "Stock crítico, sobrestock y reposición",
        "icon": "🏬"
      },
      {
        "id": "logistics",
        "title": "Logística de importación",
        "description": "Lead time, proveedores y escenarios",
        "icon": "🚢"
      },
      {
        "id": "bi-dashboard",
        "title": "Dashboard BI ejecutivo",
        "description": "Rentabilidad, riesgo y oportunidad",
        "icon": "📊"
      },
      {
        "id": "alerts",
        "title": "Alertas críticas",
        "description": "Riesgos y oportunidades para decisión",
        "icon": "🔔"
      },
      {
        "id": "executive-reports",
        "title": "Reportes gerenciales",
        "description": "Informes estratégicos de importación",
        "icon": "📊"
      }
    ]
  },
  "consultation": {
    "id": "consultation",
    "label": "Usuario consulta",
    "email": "consulta@soonest.pe",
    "password": "demo123",
    "accent": "#16a34a",
    "icon": "👁️",
    "description": "Consulta de información autorizada sin permisos de creación, edición, aprobación o eliminación.",
    "modules": [
      {
        "id": "dashboard",
        "title": "Dashboard consulta",
        "description": "Vista simple de indicadores permitidos",
        "icon": "🏠"
      },
      {
        "id": "catalog-view",
        "title": "Catálogo de repuestos",
        "description": "Consulta de productos y compatibilidades",
        "icon": "🧩"
      },
      {
        "id": "automotive-park-view",
        "title": "Parque automotor",
        "description": "Consulta de marcas, modelos y regiones",
        "icon": "🚗"
      },
      {
        "id": "sales-history-view",
        "title": "Ventas históricas",
        "description": "Consulta limitada de rotación y demanda",
        "icon": "💳"
      },
      {
        "id": "forecast-view",
        "title": "Forecasting publicado",
        "description": "Consulta de predicciones generadas",
        "icon": "🧠"
      },
      {
        "id": "recommendations-view",
        "title": "Recomendaciones publicadas",
        "description": "Consulta de productos sugeridos",
        "icon": "✨"
      },
      {
        "id": "reports-view",
        "title": "Reportes básicos",
        "description": "Visualización y descarga de reportes permitidos",
        "icon": "📄"
      }
    ]
  }
};

export const demoUsers = Object.values(roles).map((role) => ({
  role: role.id,
  roleLabel: role.label,
  email: role.email,
  password: role.password,
  name: role.id === "admin" ? "Carla Medina" : role.id === "analyst" ? "Luis Rojas" : role.id === "manager" ? "María Salas" : "Diego Paredes",
  accent: role.accent,
}));

export function getRole(roleId) {
  return roles[roleId] ?? roles.admin;
}
