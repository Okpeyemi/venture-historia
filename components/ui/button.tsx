import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary:   "bg-text-primary text-[var(--color-base)] hover:opacity-90 disabled:opacity-50",
  secondary: "bg-panel-elev text-text-default border border-border-default hover:bg-border-default disabled:opacity-50",
  ghost:     "bg-transparent text-text-default border border-border-subtle hover:bg-panel-elev disabled:opacity-50",
  success:   "bg-success text-white hover:opacity-90 disabled:opacity-50",
  danger:    "bg-crit text-white hover:opacity-90 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-1.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...rest}
      className={`rounded-md font-medium transition ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    />
  );
}
