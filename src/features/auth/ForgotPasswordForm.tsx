"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CountryPhoneField, intlPhone, isValidIntlPhone, type IntlPhone } from "@/components/ui/Field";
import { api, errorMessage } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { S } from "@/lib/strings";

export function ForgotPasswordForm() {
  const [phone, setPhone] = useState<IntlPhone>({ code: "+966", digits: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isValidIntlPhone(phone)) {
      setError(S.errors.invalidPhoneIntl);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api(Endpoints.forgotPassword, { phone: intlPhone(phone) });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-line bg-white p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-bold">{S.auth.forgotTitle}</h1>
        <p className="text-muted">{S.auth.forgotSubtitle}</p>
      </div>
      {done ? (
        <p className="rounded-xl bg-success-soft px-4 py-3 leading-7 text-success-ink" role="status">
          {S.auth.forgotDone}
        </p>
      ) : (
        <>
          <CountryPhoneField label={S.auth.phone} value={phone} onChange={setPhone} placeholder={S.auth.phonePlaceholder} error={error} autoFocus />
          <Button type="submit" size="lg" block loading={loading}>
            {S.auth.forgotButton}
          </Button>
        </>
      )}
      <Link href="/login" className="self-center text-sm font-semibold text-primary hover:underline">
        {S.auth.backToLogin}
      </Link>
    </form>
  );
}
