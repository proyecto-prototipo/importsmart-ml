import { useState } from "react";
import LoginPage from "./features/auth/LoginPage.jsx";
import AppShell from "./app/layouts/AppShell.jsx";

const savedUser = (() => {
  try { return JSON.parse(localStorage.getItem("importsmart-user")); } catch { return null; }
})();

export default function App() {
  const [user, setUser] = useState(savedUser);

  function handleLogin(nextUser) {
    localStorage.setItem("importsmart-user", JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function handleLogout() {
    localStorage.removeItem("importsmart-user");
    setUser(null);
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <AppShell user={user} onLogout={handleLogout} />;
}
