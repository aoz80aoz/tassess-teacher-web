import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { S } from "@/lib/strings";

type Variant = "primary" | "accent" | "outline" | "soft" | "ghost" | "danger" | "success" | "onDark";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  accent: "bg-accent text-white hover:bg-accent-dark",
  outline: "bg-white text-primary border-[1.5px] border-primary hover:bg-primary-soft",
  soft: "bg-soft text-ink hover:bg-line",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  danger: "bg-white text-danger border-[1.5px] border-danger-line hover:bg-danger-soft",
  success: "bg-success text-white hover:bg-success-ink",
  onDark: "bg-white/15 text-white hover:bg-white/25",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-10 px-3.5 text-sm rounded-[10px]",
  md: "min-h-11 px-5 text-[15px] rounded-xl",
  lg: "min-h-13 px-6 text-base rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", block = false) {
  return clsx(
    "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
  );
}

/** Three pulsing dots: the app's loading look for tap-started work. */
export function Dots({ className }: { className?: string }) {
  return (
    <span role="status" aria-label={S.common.loading} className={clsx("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-pulse rounded-full bg-current" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant, size, block, icon, loading, children, className, disabled, type = "button", ...rest }: CommonProps & ComponentProps<"button">) {
  return (
    <button type={type} className={clsx(buttonClass(variant, size, block), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Dots /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, icon, children, className, ...rest }: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={clsx(buttonClass(variant, size, block), className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}

export function IconButton({ icon, label, className, variant = "plain", ...rest }: { icon: IconName; label: string; variant?: "plain" | "danger" } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "inline-grid size-10 shrink-0 place-items-center rounded-[10px] border border-line bg-white transition-colors disabled:opacity-50",
        variant === "danger" ? "text-danger hover:bg-danger-soft" : "text-ink-2 hover:bg-soft",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
