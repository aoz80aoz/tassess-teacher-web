import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Icon } from "./Icon";

const control =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-primary disabled:bg-soft aria-[invalid=true]:border-danger";

function Wrapper({ id, label, error, hint, children, className }: { id: string; label?: ReactNode; error?: string | null; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-2">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type FieldProps = { label?: ReactNode; error?: string | null; hint?: ReactNode; wrapperClassName?: string };

export function TextField({ label, error, hint, wrapperClassName, className, id, ...rest }: FieldProps & ComponentProps<"input">) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Wrapper id={fieldId} label={label} error={error} hint={hint} className={wrapperClassName}>
      <input id={fieldId} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${fieldId}-error` : undefined} className={clsx(control, "min-h-12", className)} {...rest} />
    </Wrapper>
  );
}

export function TextArea({ label, error, hint, wrapperClassName, className, id, rows = 4, ...rest }: FieldProps & ComponentProps<"textarea">) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Wrapper id={fieldId} label={label} error={error} hint={hint} className={wrapperClassName}>
      <textarea id={fieldId} rows={rows} aria-invalid={Boolean(error) || undefined} className={clsx(control, "py-3 leading-7", className)} {...rest} />
    </Wrapper>
  );
}

export function Select({ label, error, hint, wrapperClassName, className, id, children, ...rest }: FieldProps & ComponentProps<"select">) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Wrapper id={fieldId} label={label} error={error} hint={hint} className={wrapperClassName}>
      <div className="relative">
        <select id={fieldId} aria-invalid={Boolean(error) || undefined} className={clsx(control, "min-h-12 appearance-none pe-10", className)} {...rest}>
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-muted">
          <Icon name="chevronDown" />
        </span>
      </div>
    </Wrapper>
  );
}

/** Saudi mobile number: fixed +966 prefix, 9 digits starting with 5. */
export function PhoneField({ label, error, value, onChange, id, ...rest }: FieldProps & { value: string; onChange: (v: string) => void } & Omit<ComponentProps<"input">, "value" | "onChange">) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Wrapper id={fieldId} label={label} error={error}>
      <div className={clsx("flex min-h-12 items-center rounded-xl border-[1.5px] bg-white focus-within:border-primary", error ? "border-danger" : "border-line")} dir="ltr">
        <span className="border-e border-line px-3 font-semibold text-ink-2">+966</span>
        <input
          id={fieldId}
          inputMode="numeric"
          autoComplete="tel-national"
          aria-invalid={Boolean(error) || undefined}
          className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0/, "").slice(0, 9))}
          {...rest}
        />
      </div>
    </Wrapper>
  );
}

export function isValidSaudiPhone(digits: string) {
  return /^5\d{8}$/.test(digits);
}

export function Checkbox({ label, className, ...rest }: { label: ReactNode } & ComponentProps<"input">) {
  return (
    <label className={clsx("inline-flex min-h-11 cursor-pointer items-center gap-2.5", className)}>
      <input type="checkbox" className="size-5 accent-primary" {...rest} />
      <span>{label}</span>
    </label>
  );
}
