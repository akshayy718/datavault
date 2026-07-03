// In Next.js, NEXT_PUBLIC_ variables are replaced at BUILD TIME.
// If the variable wasn't set when Vercel built the app, it becomes undefined.
// We hardcode the production URL as the fallback so it always works
// regardless of whether the env var was set during the Vercel build.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://datavault-api-w0sn.onrender.com/api/v1";

// ─── Token storage ────────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dv_access_token");
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dv_refresh_token");
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem("dv_access_token", access);
  localStorage.setItem("dv_refresh_token", refresh);
}
export function clearTokens() {
  localStorage.removeItem("dv_access_token");
  localStorage.removeItem("dv_refresh_token");
}

// ─── Core request with automatic token refresh ────────────────────────────────
// This is the key fix for "Invalid or expired token" errors.
// When any request gets a 401, we automatically try to get a new access token
// using the refresh token (which lasts 7 days), then retry the original request.
// If the refresh also fails, we clear tokens and the auth hook logs the user out.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error("Session expired. Please sign in again.");
  }

  const data = await res.json();
  const newAccess = data.data.access_token;
  const newRefresh = data.data.refresh_token;
  setTokens(newAccess, newRefresh);
  return newAccess;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
  isRetry = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-refresh on 401 (expired token), but only once to avoid infinite loops
  if (res.status === 401 && authenticated && !isRetry) {
    try {
      let newToken: string;
      if (isRefreshing) {
        // Another request is already refreshing — queue this one
        newToken = await new Promise<string>(resolve => {
          refreshQueue.push(resolve);
        });
      } else {
        isRefreshing = true;
        newToken = await doRefresh();
        refreshQueue.forEach(cb => cb(newToken));
        refreshQueue = [];
        isRefreshing = false;
      }
      // Retry the original request with the new token
      return request<T>(path, options, authenticated, true);
    } catch {
      isRefreshing = false;
      refreshQueue = [];
      throw new Error("Session expired. Please sign in again.");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  signup: (email: string, password: string, name: string) =>
    request<{ data: { id: string; email: string; name: string } }>(
      "/auth/signup",
      { method: "POST", body: JSON.stringify({ email, password, name }) },
      false
    ),
  login: (email: string, password: string) =>
    request<{ data: { access_token: string; refresh_token: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    ),
  me: () => request<{ data: { id: string; email: string; name: string } }>("/auth/me"),
};

// ─── Datasets ─────────────────────────────────────────────────────────────────
export const datasets = {
  list: () => request<{ data: Dataset[] }>("/datasets"),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ data: Dataset }>("/datasets", { method: "POST", body: form });
  },
  getRows: (id: string) => request<{ data: DatasetRow[] }>(`/datasets/${id}/rows`),
};

// ─── Shares ───────────────────────────────────────────────────────────────────
export const shares = {
  create: (payload: CreateSharePayload) =>
    request<{ data: Share }>("/shares", { method: "POST", body: JSON.stringify(payload) }),
  get: (id: string) => request<{ data: Share }>(`/shares/${id}`),
  revoke: (id: string) =>
    request<{ data: Share }>(`/shares/${id}/revoke`, { method: "POST" }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analytics = {
  workspace: () => request<{ data: WorkspaceAnalytics }>("/workspaces/me/analytics"),
  share: (id: string) => request<{ data: ShareAnalytics }>(`/shares/${id}/analytics`),
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Dataset {
  id: string;
  original_filename: string;
  schema_definition: { column_name: string; data_type: string }[];
  row_count: number;
  created_at: string;
}

export interface DatasetRow {
  id: string;
  dataset_id: string;
  row_index: number;
  row_data: Record<string, string>;
}

export interface Share {
  id: string;
  token: string;
  mode: string;
  format: string;
  qr_image_url?: string;
  view_count: number;
  revoked: boolean;
  expires_at?: string;
  max_views?: number;
  created_at: string;
  template_id?: string;
}

export interface CreateSharePayload {
  dataset_id: string;
  selection_type: "row" | "cell" | "column" | "range" | "filter";
  selection_spec: Record<string, unknown>;
  mode: "snapshot" | "live";
  format?: string;
  pin?: string;
  expires_at?: string;
  max_views?: number;
  template_id?: string;
}

export interface WorkspaceAnalytics {
  workspace_id: string;
  total_shares: number;
  total_views: number;
  top_shares: { share_id: string; token: string; view_count: number; mode: string }[];
}

export interface ShareAnalytics {
  share_id: string;
  total_views: number;
  device_breakdown: Record<string, number>;
  views_by_day: { day: string; count: number }[];
  recent_views: { viewed_at: string; device_type: string; country: string | null }[];
}
