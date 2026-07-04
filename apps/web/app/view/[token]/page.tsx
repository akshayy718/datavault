/**
 * Recipient View — Server Side Rendered for fast phone loading.
 *
 * KEY CHANGE: This page now fetches data on VERCEL'S SERVER, not in the
 * phone's browser. This means:
 * - Server-to-server request (Vercel → Render) is much faster than
 *   phone browser → Render, because Vercel's servers have better
 *   network connections and are not throttled by mobile Safari.
 * - Phone just receives a complete HTML page and displays it instantly.
 * - No slow JavaScript fetch on the phone at all.
 *
 * PIN-protected shares still need a client-side unlock step (the user
 * types the PIN in the browser), but that is now ONE request instead
 * of TWO, and the initial page load is instant.
 */
import { Metadata } from "next";
import RecipientClient from "./RecipientClient";

// The backend origin — used by the SERVER to fetch share data.
// This must be the actual Render URL, never localhost.
const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://datavault-api-w0sn.onrender.com/api/v1"
).replace("/api/v1", "");

// ─── Server-side data fetch ───────────────────────────────────────────────────
async function getShareData(token: string) {
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/view/${token}`, {
      next: { revalidate: 0 }, // never cache — shares can expire/be revoked
      signal: AbortSignal.timeout(12000), // 12 second timeout for Vercel free tier
    });

    if (res.ok) {
      const json = await res.json();
      return { data: json.data ?? json, status: 200 };
    }
    return { data: null, status: res.status };
  } catch {
    // Server fetch failed — return null so client can retry
    return { data: null, status: 503 };
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  return {
    title: "DataVault — Shared Data",
    description: "View shared data via DataVault",
  };
}

// ─── Page component (Server Component) ───────────────────────────────────────
export default async function RecipientPage({
  params,
}: {
  params: { token: string };
}) {
  const { data, status } = await getShareData(params.token);

  return (
    <RecipientClient
      token={params.token}
      initialData={data}
      initialStatus={status}
      backendOrigin={BACKEND_ORIGIN}
    />
  );
}
