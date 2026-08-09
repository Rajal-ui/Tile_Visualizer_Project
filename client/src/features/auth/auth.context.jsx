import { createContext, useContext, useEffect, useState } from "react";
import { ADMIN_CREDENTIALS, SESSION_KEY } from "./auth.constants.js";

const AuthContext = createContext(null);

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession);

  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const login = (username, password) => {
    if (
      username.trim().toLowerCase() === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      setUser({ username: username.trim(), loginAt: Date.now() });
      return { ok: true };
    }
    return { ok: false, message: "Invalid credentials. Try the demo login below." };
  };

  const logout = () => setUser(null);

  const value = { user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
