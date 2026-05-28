import { useEffect, useMemo, useState } from "react";
import { getRole } from "../../shared/config/roles.js";
import { featureRegistry } from "../../features/registry.js";
import "./AppShell.css";

export default function AppShell({ user, onLogout }) {
  const role = getRole(user.role);
  const [activeModule, setActiveModule] = useState(
    role.modules[0]?.id ?? "dashboard"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!role.modules.some((module) => module.id === activeModule)) {
      setActiveModule(role.modules[0]?.id ?? "dashboard");
    }
  }, [role.id, activeModule, role.modules]);

  const CurrentPage = useMemo(() => {
    return (
      featureRegistry[user.role]?.[activeModule] ??
      featureRegistry[user.role]?.dashboard
    );
  }, [user.role, activeModule]);

  const activeModuleInfo = role.modules.find((m) => m.id === activeModule);

  function handleModuleClick(moduleId) {
    setActiveModule(moduleId);
    setSidebarOpen(false);
  }

  function handleLogout() {
    setSidebarOpen(false);
    onLogout();
  }

  return (
    <div className="app-shell" style={{ "--role-accent": role.accent }}>
      {sidebarOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="app-sidebar-mobile-head">
          <span>Menú principal</span>
          <button type="button" onClick={() => setSidebarOpen(false)}>
            ×
          </button>
        </div>

        <div className="app-brand">
          <div className="app-brand-mark">IS</div>
          <div>
            <strong>ImportSmart ML</strong>
            <span>Soonest Parts E.I.R.L.</span>
          </div>
        </div>

        <div className="app-role-card">
          <span>{role.icon}</span>
          <div>
            <strong>{role.label}</strong>
            <small>{role.description}</small>
          </div>
        </div>

        <nav className="app-nav">
          {role.modules.map((module) => (
            <button
              key={module.id}
              className={activeModule === module.id ? "active" : ""}
              onClick={() => handleModuleClick(module.id)}
            >
              <span>{module.icon}</span>
              <div>
                <strong>{module.title}</strong>
                <small>{module.description}</small>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      <section className="app-content">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button
              type="button"
              className="app-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>

            <div>
              <span className="app-breadcrumb">PMV / {role.label}</span>
              <h1>{activeModuleInfo?.title}</h1>
            </div>
          </div>

          <div className="app-user-box">
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <button onClick={handleLogout}>Salir</button>
          </div>
        </header>

        <CurrentPage />
      </section>
    </div>
  );
}