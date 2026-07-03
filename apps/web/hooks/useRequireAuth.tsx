"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Protects a page: while auth is resolving, callers show a loader; once
 * resolved, an unauthenticated user is bounced to /auth. Returns the
 * current auth state so the page can render a loader until ready.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  return { user, loading };
}
