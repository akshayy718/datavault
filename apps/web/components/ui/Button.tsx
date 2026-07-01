"use client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E6A7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090A] disabled:pointer-events-none disabled:opacity-40",
          {
            "bg-[#00E6A7] text-[#08090A] hover:bg-[#00E6A7]/90 active:scale-[0.98]": variant === "primary",
            "bg-transparent text-white hover:bg-white/5 active:scale-[0.98]": variant === "ghost",
            "border border-white/10 bg-transparent text-white hover:bg-white/5 hover:border-white/20 active:scale-[0.98]": variant === "outline",
          },
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-11 px-5 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
