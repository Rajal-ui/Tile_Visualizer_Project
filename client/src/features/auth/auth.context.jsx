import { createContext, useContext, useEffect, useState, useRef } from "react";
import { API_BASE } from "@/services/api-base.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    fetch(`${API_BASE}/api/auth/me`, {
      signal: abortRef.current.signal,
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setUser(null);
      })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, []);

  const login = async (username, password) => {
    abortRef.current?.abort();
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        return { ok: true };
      }

      return { ok: false, message: data.error || "Invalid credentials." };
    } catch (err) {
      return { ok: false, message: "Network error, please try again." };
    }
  };

  const logout = async () => {
    abortRef.current?.abort();
    try {
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        return { ok: true };
      }
      return { ok: false, message: "Failed to log out." };
    } catch (e) {
      return { ok: false, message: "Network error on logout." };
    }
  };

  const value = { user, login, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
