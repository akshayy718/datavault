"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, setTokens, clearTokens, getRefreshToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Called on mount — tries to restore session from stored token.
  // If the access token is expired, tries the refresh token automatically.
  // Only redirects to /auth if BOTH tokens are invalid/missing.
  const refresh = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("dv_access_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      // Try /auth/me — the api.ts request() function will auto-refresh if it gets a 401
      const res = await auth.me();
      setUser(res.data);
    } catch {
      // Both access token and refresh token failed — clear everything
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run on mount
  const [initialized, setInitialized] = useState(false);
  if (!initialized && typeof window !== "undefined") {
    setInitialized(true);
    refresh();
  }

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth.login(email, password);
    setTokens(res.data.access_token, res.data.refresh_token);
    const me = await auth.me();
    setUser(me.data);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    await auth.signup(email, password, name);
    const res = await auth.login(email, password);
    setTokens(res.data.access_token, res.data.refresh_token);
    const me = await auth.me();
    setUser(me.data);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push("/auth");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
