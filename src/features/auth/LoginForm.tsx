"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { isValidSaudiPhone, PhoneField, TextField } from "@/components/ui/Field";
import { errorMessage } from "@/lib/api/client";
import { track } from "@/lib/analytics";
import { S } from "@/lib/strings";
import { authPost, fullPhone, safeNext } from "./auth-api";
import { DemoHint } from "./DemoHint";

export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isValidSaudiPhone(phone)) next.phone = S.errors.invalidPhone;
    if (password.length < 6) next.password = S.errors.passwordShort;
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await authPost("login", { phone: fullPhone(phone), password });
      track("login", { method: "phone" });
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-line bg-white p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-bold">{S.auth.loginTitle}</h1>
        <p className="text-muted">{S.auth.loginSubtitle}</p>
      </div>
      <DemoHint visible={demo} />
      <PhoneField label={S.auth.phone} value={phone} onChange={setPhone} placeholder={S.auth.phonePlaceholder} error={errors.phone} autoFocus />
      <div className="relative">
        <TextField
          label={S.auth.password}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          className="pe-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? S.auth.hidePassword : S.auth.showPassword}
          className="absolute end-1 top-[30px] grid size-11 place-items-center text-muted"
        >
          <Icon name={showPassword ? "eyeOff" : "eye"} />
        </button>
      </div>
      <Link href="/forgot-password" className="-mt-2 self-start text-sm text-primary hover:underline">
        {S.auth.forgotPassword}
      </Link>
      {errors.form && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-ink" role="alert">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" block loading={loading}>
        {S.auth.loginButton}
      </Button>
      <p className="text-center text-sm text-muted">
        {S.auth.noAccount}{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {S.auth.createAccount}
        </Link>
      </p>
    </form>
  );
}
