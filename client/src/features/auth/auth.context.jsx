import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  bumpAuthGeneration,
  AUTH_UNAUTHORIZED_EVENT,
} from "@/lib/api-client.js";

const AuthContext = createContext(null);

/** Query cache key holding the authenticated user (or null). */
export const AUTH_QUERY_KEY = ["auth", "me"];

async function fetchMe() {
  const data = await apiClient.get("/api/auth/me");
  return data?.user || null;
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const setUser = useCallback(
    (user) => queryClient.setQueryData(AUTH_QUERY_KEY, user),
    [queryClient]
  );

  // Global session handling: any 401 (from the apiClient interceptor) resets
  // the authenticated user to unauthenticated.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [setUser]);

  const login = useCallback(
    async (username, password) => {
      try {
        const data = await apiClient.post("/api/auth/login", { username, password });
        if (data?.token) {
          localStorage.setItem("tv_token", data.token);
        }
        // Start a new authentication epoch so stale pre-login 401 responses
        // are ignored by the global 401 handler.
        bumpAuthGeneration();
        setUser(data?.user || null);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err.message };
      }
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout");
      return { ok: true };
    } catch {
      return { ok: false, message: "Failed to log out." };
    } finally {
      localStorage.removeItem("tv_token");
      setUser(null);
    }
  }, [setUser]);

  const value = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      login,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
