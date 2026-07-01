"use client";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#9CA3AF]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              "h-14 w-full rounded-xl px-4 text-sm text-white transition-all duration-200",
              "placeholder:text-[#9CA3AF]",
              "focus:outline-none",
              "hover:border-white/15",
              "[&:-webkit-autofill]:bg-transparent",
              "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgba(255,255,255,0.03)]",
              "[&:-webkit-autofill]:[filter:none]",
              "[&:-webkit-autofill]:[-webkit-text-fill-color:#fff]",
              icon && "pl-10",
              error && "border-red-500/50",
              className
            )}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)"}`,
            }}
            onFocus={e => {
              if (!error) e.currentTarget.style.border = "1px solid #00E6A7";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,230,167,0.12)";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onBlur={e => {
              e.currentTarget.style.border = `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)"}`;
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
