/**
 * PIN Unlock Proxy — runs on Vercel's server, not in the phone's browser.
 *
 * WHY THIS EXISTS:
 * When a share has a PIN, the phone needs to verify the PIN with the Render
 * backend in Singapore. A direct phone → Render request takes 20-30 seconds
 * because mobile browsers throttle network requests to save battery.
 *
 * This API route acts as a middleman:
 *   Phone → Vercel (fast, nearby) → Render (slow, Singapore) → Vercel → Phone
 *
 * The phone's request to Vercel is instant (Vercel has edge servers worldwide).
 * Vercel then talks to Render server-to-server, which is faster than phone-to-Render.
 * The phone gets the result from Vercel quickly.
 *
 * This is called a "proxy" — like a fast assistant who makes calls on your behalf.
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://datavault-api-3j82.onrender.com/api/v1"
).replace("/api/v1", "");

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    // Read the PIN from the phone's request
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { detail: "PIN is required" },
        { status: 400 }
      );
    }

    // Vercel's server sends the unlock request to Render
    // This server-to-server request is much faster than phone-to-Render
    const res = await fetch(`${BACKEND_ORIGIN}/view/${token}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const data = await res.json();

    // Forward Render's response back to the phone
    return NextResponse.json(data, { status: res.status });

  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { detail: "Server took too long to respond. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { detail: "Could not reach the server. Please try again." },
      { status: 503 }
    );
  }
}
