import clsx from "clsx";
import { clampPercent, percent } from "@/lib/format";

export function ProgressBar({ value, color = "var(--color-primary)", track = "var(--color-line)", height = 8, label }: { value: number; color?: string; track?: string; height?: number; label?: string }) {
  const v = clampPercent(value);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="w-full overflow-hidden rounded-full"
      style={{ height, background: track }}
    >
      <div className="h-full rounded-full transition-[width]" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 104, color = "var(--color-success)", track = "var(--color-line)", className }: { value: number; size?: number; color?: string; track?: string; className?: string }) {
  const v = clampPercent(value);
  const inner = Math.round(size * 0.79);
  return (
    <div
      className={clsx("grid shrink-0 place-items-center rounded-full", className)}
      style={{ width: size, height: size, background: `conic-gradient(${color} ${v}%, ${track} 0)` }}
      role="img"
      aria-label={percent(v)}
    >
      <span className="grid place-items-center rounded-full bg-white font-bold" style={{ width: inner, height: inner, fontSize: size * 0.19 }}>
        {percent(v)}
      </span>
    </div>
  );
}

/** A thin sweeping bar for loading inside dialogs and fields. */
export function IndeterminateBar() {
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-primary-soft" role="status">
      <div className="tt-sweep h-full w-1/3 rounded-full bg-primary" />
    </div>
  );
}
