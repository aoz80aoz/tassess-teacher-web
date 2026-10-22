"use client";

import clsx from "clsx";

export interface TabItem<K extends string> {
  key: K;
  label: string;
}

export function Tabs<K extends string>({
  items,
  value,
  onChange,
  className,
  tone = "soft",
  label,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  tone?: "soft" | "solid";
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={clsx("flex flex-wrap gap-1 rounded-xl p-1", tone === "soft" ? "bg-soft" : "border border-line bg-white", className)}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={clsx(
              "min-h-10 rounded-[10px] px-4 text-sm transition-colors",
              active ? (tone === "soft" ? "bg-white font-semibold text-primary shadow-sm" : "bg-primary font-semibold text-white") : "text-ink-2 hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented choice (e.g. present / absent / late). */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string; activeClass: string }[];
  value: K | null;
  onChange: (key: K) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-soft p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={clsx("min-h-9 rounded-[9px] px-3.5 text-sm transition-colors", value === o.key ? clsx("font-semibold text-white", o.activeClass) : "text-ink-2 hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
