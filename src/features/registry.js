import AdminDashboardPage from "./admin/dashboard/index.jsx";
import AdminUsersSecurityPage from "./admin/users-security/index.jsx";
import AdminDataIntegrationPage from "./admin/data-integration/index.jsx";
import AdminDataStoragePage from "./admin/data-storage/index.jsx";
import AdminDataQualityPage from "./admin/data-quality/index.jsx";
import AdminCatalogPage from "./admin/catalog/index.jsx";
import AdminAlertsPage from "./admin/alerts/index.jsx";
import AdminReportsPage from "./admin/reports/index.jsx";
import AdminModelAdminPage from "./admin/model-admin/index.jsx";
import AdminAuditLogPage from "./admin/audit-log/index.jsx";
import AnalystDashboardPage from "./analyst/dashboard/index.jsx";
import AnalystDataUploadPage from "./analyst/data-upload/index.jsx";
import AnalystDataQualityPage from "./analyst/data-quality/index.jsx";
import AnalystCatalogAnalysisPage from "./analyst/catalog-analysis/index.jsx";
import AnalystAutomotiveParkPage from "./analyst/automotive-park/index.jsx";
import AnalystSalesHistoryPage from "./analyst/sales-history/index.jsx";
import AnalystDemandForecastPage from "./analyst/demand-forecast/index.jsx";
import AnalystImportRecommendationsPage from "./analyst/import-recommendations/index.jsx";
import AnalystBiDashboardPage from "./analyst/bi-dashboard/index.jsx";
import AnalystReportsPage from "./analyst/reports/index.jsx";
import ManagerDashboardPage from "./manager/dashboard/index.jsx";
import ManagerImportRecommendationsPage from "./manager/import-recommendations/index.jsx";
import ManagerForecastReviewPage from "./manager/forecast-review/index.jsx";
import ManagerInventoryPage from "./manager/inventory/index.jsx";
import ManagerLogisticsPage from "./manager/logistics/index.jsx";
import ManagerBiDashboardPage from "./manager/bi-dashboard/index.jsx";
import ManagerAlertsPage from "./manager/alerts/index.jsx";
import ManagerExecutiveReportsPage from "./manager/executive-reports/index.jsx";
import ConsultationDashboardPage from "./consultation/dashboard/index.jsx";
import ConsultationCatalogViewPage from "./consultation/catalog-view/index.jsx";
import ConsultationAutomotiveParkViewPage from "./consultation/automotive-park-view/index.jsx";
import ConsultationSalesHistoryViewPage from "./consultation/sales-history-view/index.jsx";
import ConsultationForecastViewPage from "./consultation/forecast-view/index.jsx";
import ConsultationRecommendationsViewPage from "./consultation/recommendations-view/index.jsx";
import ConsultationReportsViewPage from "./consultation/reports-view/index.jsx";

export const featureRegistry = {
  admin: {
    "dashboard": AdminDashboardPage,
    "users-security": AdminUsersSecurityPage,
    "data-integration": AdminDataIntegrationPage,
    "data-storage": AdminDataStoragePage,
    "data-quality": AdminDataQualityPage,
    "catalog": AdminCatalogPage,
    "alerts": AdminAlertsPage,
    "reports": AdminReportsPage,
    "model-admin": AdminModelAdminPage,
    "audit-log": AdminAuditLogPage
  },
  analyst: {
    "dashboard": AnalystDashboardPage,
    "data-upload": AnalystDataUploadPage,
    "data-quality": AnalystDataQualityPage,
    "catalog-analysis": AnalystCatalogAnalysisPage,
    "automotive-park": AnalystAutomotiveParkPage,
    "sales-history": AnalystSalesHistoryPage,
    "demand-forecast": AnalystDemandForecastPage,
    "import-recommendations": AnalystImportRecommendationsPage,
    "bi-dashboard": AnalystBiDashboardPage,
    "reports": AnalystReportsPage
  },
  manager: {
    "dashboard": ManagerDashboardPage,
    "import-recommendations": ManagerImportRecommendationsPage,
    "forecast-review": ManagerForecastReviewPage,
    "inventory": ManagerInventoryPage,
    "logistics": ManagerLogisticsPage,
    "bi-dashboard": ManagerBiDashboardPage,
    "alerts": ManagerAlertsPage,
    "executive-reports": ManagerExecutiveReportsPage
  },
  consultation: {
    "dashboard": ConsultationDashboardPage,
    "catalog-view": ConsultationCatalogViewPage,
    "automotive-park-view": ConsultationAutomotiveParkViewPage,
    "sales-history-view": ConsultationSalesHistoryViewPage,
    "forecast-view": ConsultationForecastViewPage,
    "recommendations-view": ConsultationRecommendationsViewPage,
    "reports-view": ConsultationReportsViewPage
  }
};
