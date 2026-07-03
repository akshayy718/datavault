"use client";
import { AuthProvider } from "@/hooks/useAuth";
import { FlowProvider } from "@/hooks/useFlow";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FlowProvider>
        <ToastProvider>{children}</ToastProvider>
      </FlowProvider>
    </AuthProvider>
  );
}
