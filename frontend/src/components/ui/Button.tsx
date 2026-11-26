"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantClasses = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg",
  secondary: "bg-surface text-text-main border border-surface-border hover:bg-beige hover:border-primary-subtle shadow-xs",
  outline: "bg-transparent text-primary border border-primary hover:bg-primary-light",
  ghost: "bg-transparent text-text-main hover:bg-beige border-transparent",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-md hover:shadow-lg",
  success: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-md hover:shadow-lg",
};

const sizeClasses = {
  xs: "px-3 py-1.5 text-[11px]",
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      iconLeft,
      iconRight,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 font-bold rounded-xl
          transition-all duration-200 cursor-pointer
          active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Spinner size="xs" className="!border-current/30 !border-t-current" />
        ) : iconLeft ? (
          <span className="flex-shrink-0">{iconLeft}</span>
        ) : null}
        <span>{children}</span>
        {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";