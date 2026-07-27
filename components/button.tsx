"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "focus-ring inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 font-mono text-sm font-medium tracking-tight transition-all duration-150",
          variant === "primary" &&
            "bg-ink text-paper hover:bg-ink-soft disabled:bg-paper-line disabled:text-slate disabled:cursor-not-allowed",
          variant === "ghost" &&
            "bg-transparent text-slate hover:text-ink underline decoration-paper-line decoration-2 underline-offset-4 hover:decoration-ink disabled:opacity-40 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
