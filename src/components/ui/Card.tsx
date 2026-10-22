import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={clsx("rounded-2xl border border-line bg-white p-5", className)} {...rest} />;
}

export function CardHeader({ title, action, subtitle }: { title: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "accent" | "sky";

const TONES: Record<Tone, string> = {
  info: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  neutral: "bg-soft text-ink-2",
  accent: "bg-accent-soft text-accent-ink",
  sky: "bg-info-soft text-info-ink",
};

export function Chip({ tone = "info", className, ...rest }: { tone?: Tone } & ComponentProps<"span">) {
  return <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium", TONES[tone], className)} {...rest} />;
}

export function StatTile({ label, value, tone = "default" }: { label: ReactNode; value: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const color = { default: "text-ink", success: "text-success", warning: "text-accent", danger: "text-danger" }[tone];
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className={clsx("mt-1 text-[26px] font-bold", color)}>{value}</div>
    </div>
  );
}
