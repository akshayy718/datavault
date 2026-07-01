const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dv_access_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("dv_access_token", access);
  localStorage.setItem("dv_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("dv_access_token");
  localStorage.removeItem("dv_refresh_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
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

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Auth ----
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

// ---- Datasets ----
export const datasets = {
  list: () => request<{ data: Dataset[] }>("/datasets"),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ data: Dataset }>("/datasets", { method: "POST", body: form });
  },
  getRows: (id: string) => request<{ data: DatasetRow[] }>(`/datasets/${id}/rows`),
};

// ---- Shares ----
export const shares = {
  create: (payload: CreateSharePayload) =>
    request<{ data: Share }>("/shares", { method: "POST", body: JSON.stringify(payload) }),
  get: (id: string) => request<{ data: Share }>(`/shares/${id}`),
  revoke: (id: string) =>
    request<{ data: Share }>(`/shares/${id}/revoke`, { method: "POST" }),
};

// ---- Recipient (public) ----
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
  : "http://localhost:8000";

export const recipient = {
  view: (token: string) =>
    fetch(`${PUBLIC_BASE}/view/${token}`).then((r) => r.json()),
};

// ---- Analytics ----
export const analytics = {
  workspace: () => request<{ data: WorkspaceAnalytics }>("/workspaces/me/analytics"),
  share: (id: string) => request<{ data: ShareAnalytics }>(`/shares/${id}/analytics`),
};

// ---- Types ----
export interface Dataset {
  id: string;
  original_filename: string;
  schema_definition: { column_name: string; data_type: string }[];
  row_count: number;
  created_at: string;
}

export interface DatasetRow {
  id: string;
  row_index: number;
  row_data: Record<string, string>;
  photo_url?: string;
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
