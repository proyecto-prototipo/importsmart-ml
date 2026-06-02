import { useMemo, useState } from "react";
import { demoUsers } from "../../shared/config/roles.js";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@soonest.pe");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const manualPreviewUrl =
    "https://drive.google.com/file/d/1E1BBkp8SV9rySbVYkbvncRpsrJ6j7rW1/preview";

  const manualDownloadUrl =
    "https://drive.google.com/uc?export=download&id=1E1BBkp8SV9rySbVYkbvncRpsrJ6j7rW1";

  const roleStyles = ["role-admin", "role-analista", "role-gerente", "role-consulta"];
  const roleIcons = ["🛡️", "📊", "📦", "👁️"];

  const selectedDemo = useMemo(
    () => demoUsers.find((user) => user.email === email),
    [email]
  );

  const selectedIndex = useMemo(
    () => demoUsers.findIndex((user) => user.email === email),
    [email]
  );

  const selectedRoleClass = selectedIndex !== -1 ? roleStyles[selectedIndex] : "";

  const rolePreview = useMemo(() => {
    const previews = {
      Administrador: {
        title: "Control total del sistema",
        description:
          "Gestiona usuarios, seguridad, carga de datos, catálogo, alertas, reportes y modelos ML.",
        badge: "Acceso completo",
        modules: ["Usuarios", "Catálogo", "Modelos ML"],
      },
      "Analista comercial": {
        title: "Análisis y predicción",
        description:
          "Analiza ventas históricas, parque automotor, calidad de datos, forecasting y recomendaciones.",
        badge: "Análisis avanzado",
        modules: ["Ventas", "Forecasting", "Recomendaciones"],
      },
      "Gerente de importaciones": {
        title: "Decisión estratégica",
        description:
          "Aprueba recomendaciones, revisa demanda proyectada, inventario, logística y reportes gerenciales.",
        badge: "Gestión ejecutiva",
        modules: ["Inventario", "Logística", "Aprobaciones"],
      },
      "Usuario consulta": {
        title: "Consulta de información",
        description:
          "Visualiza catálogo, predicciones, reportes y recomendaciones en modo solo lectura.",
        badge: "Solo lectura",
        modules: ["Consulta", "Reportes", "Predicción"],
      },
    };

    return (
      previews[selectedDemo?.roleLabel] || {
        title: "Selecciona un acceso demo",
        description: "Elige un usuario para cargar automáticamente sus credenciales.",
        badge: "Demo",
        modules: ["Roles", "Módulos", "Acceso"],
      }
    );
  }, [selectedDemo]);

  function submit(event) {
    event.preventDefault();

    const user = demoUsers.find(
      (item) => item.email === email && item.password === password
    );

    if (!user) {
      setError("Credenciales incorrectas. Usa uno de los accesos demo.");
      return;
    }

    setError("");

    localStorage.setItem("currentUser", JSON.stringify(user));

    onLogin(user);
  }

  function fillDemo(user) {
    setEmail(user.email);
    setPassword(user.password);
    setError("");
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-glow login-glow-one" />
          <div className="login-glow login-glow-two" />

          <div className="login-brand">
            <span className="login-logo">IS</span>
            <div>
              <strong>ImportSmart ML</strong>
              <p>Inteligencia de importación para Soonest Parts</p>
            </div>
          </div>

          <div className="login-hero-content">
            <span className="login-eyebrow">PMV funcional por roles</span>

            <h1>Importa repuestos con datos, predicción y menor riesgo.</h1>

            <p className="login-copy">
              Plataforma predictiva para analizar ventas, parque automotor,
              inventario y demanda regional. Cada rol tiene módulos distintos
              según su responsabilidad dentro del sistema.
            </p>

            <div className="login-highlights">
              <span>Forecasting</span>
              <span>Recomendaciones</span>
              <span>Inventario</span>
              <span>Reportes</span>
            </div>
          </div>

          <div className="login-hero-footer-stats">
            <div>
              <strong>15+</strong>
              <span>Módulos</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Roles</span>
            </div>
            <div>
              <strong>PMV</strong>
              <span>Demo lista</span>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-card-header">
              <span>Acceso demo</span>
              <h2>Iniciar sesión</h2>
              <p>Selecciona un rol y las credenciales se completarán automáticamente.</p>
            </div>

            <div className="login-role-selector">
              {demoUsers.map((user, index) => {
                const currentRoleClass = roleStyles[index % roleStyles.length];
                const isActive = email === user.email;

                return (
                  <button
                    type="button"
                    key={user.email}
                    onClick={() => fillDemo(user)}
                    className={`role-pill ${currentRoleClass} ${isActive ? "active" : ""}`}
                  >
                    <span className="role-pill-icon">{roleIcons[index]}</span>

                    <span className="role-pill-text">
                      <strong>{user.roleLabel}</strong>
                      <small>{user.email}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={`login-role-preview ${selectedRoleClass}`}>
              <div>
                <span className="preview-badge">{rolePreview.badge}</span>
                <h3>{rolePreview.title}</h3>
                <p>{rolePreview.description}</p>
              </div>

              <div className="preview-module-list">
                {rolePreview.modules.map((item) => (
                  <small key={item}>{item}</small>
                ))}
              </div>
            </div>

            <form onSubmit={submit} className="login-form">
              <div className="login-input-group">
                <label htmlFor="email">Correo electrónico</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">✉</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@soonest.pe"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label htmlFor="password">Contraseña</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">🔒</span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className={`login-submit ${selectedRoleClass}`}>
                Ingresar como {selectedDemo?.roleLabel ?? "usuario"}
                <span>→</span>
              </button>

              <div className="login-manual-actions">
                <a
                  href={manualPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-manual-button login-manual-view"
                >
                  Ver manual de usuario
                </a>

                <a
                  href={manualDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-manual-button login-manual-download"
                >
                  Descargar manual
                </a>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}