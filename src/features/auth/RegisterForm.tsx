"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { isValidSaudiPhone, PhoneField, Select, TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Tabs";
import { api, errorMessage } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { Named, NationalitiesAndRegions } from "@/lib/api/types";
import { track } from "@/lib/analytics";
import { S } from "@/lib/strings";
import { authPost, fullPhone } from "./auth-api";
import { DemoHint } from "./DemoHint";
import { OtpInput } from "./OtpInput";

type Step = "phone" | "otp" | "details";
const RESEND_SECONDS = 60;

export function RegisterForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    if (!isValidSaudiPhone(phone)) {
      setError(S.errors.invalidPhone);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api(Endpoints.sendTeacherOtp, { phone: fullPhone(phone), type: "sms" });
      setStep("otp");
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api(Endpoints.verifyTeacherOtp, { phone: fullPhone(phone), code });
      setStep("details");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-line bg-white p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-bold">{step === "otp" ? S.auth.otpTitle : S.auth.registerTitle}</h1>
        <p className="text-muted">{step === "otp" ? S.auth.otpSent(fullPhone(phone)) : S.auth.registerSubtitle}</p>
      </div>
      <DemoHint visible={demo} />

      {step === "phone" && (
        <form onSubmit={sendCode} noValidate className="flex flex-col gap-5">
          <PhoneField label={S.auth.phone} value={phone} onChange={setPhone} placeholder={S.auth.phonePlaceholder} error={error} autoFocus />
          <Button type="submit" size="lg" block loading={loading}>
            {S.auth.sendCode}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verify} className="flex flex-col gap-5">
          <OtpInput value={code} onChange={setCode} />
          {error && (
            <p className="text-center text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" block loading={loading} disabled={code.length < 4}>
            {S.auth.verify}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className="min-h-11 text-primary" onClick={() => setStep("phone")}>
              {S.auth.changePhone}
            </button>
            {seconds > 0 ? (
              <span className="text-muted">{S.auth.resendIn(seconds)}</span>
            ) : (
              <button type="button" className="min-h-11 text-primary" onClick={() => sendCode()}>
                {S.auth.resend}
              </button>
            )}
          </div>
        </form>
      )}

      {step === "details" && (
        <DetailsForm
          phone={fullPhone(phone)}
          onDone={() => {
            track("sign_up", { method: "phone" });
            router.replace("/app");
            router.refresh();
          }}
        />
      )}

      {step !== "details" && (
        <p className="text-center text-sm text-muted">
          {S.auth.haveAccount}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {S.auth.loginButton}
          </Link>
        </p>
      )}
    </div>
  );
}

function DetailsForm({ phone, onDone }: { phone: string; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", gender: "female", password: "", confirm: "", nationality_id: "", region_id: "", city_id: "", district_id: "", school_id: "", manager_name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const lookups = useApiQuery<NationalitiesAndRegions>(Endpoints.nationalitiesAndRegions, undefined, { staleTime: Infinity });
  const cities = useApiQuery<Named[]>(Endpoints.cities, { region_id: form.region_id }, { enabled: Boolean(form.region_id) });
  const districts = useApiQuery<Named[]>(Endpoints.districts, { city_id: form.city_id }, { enabled: Boolean(form.city_id) });
  const schools = useApiQuery<Named[]>(Endpoints.schools, { district_id: form.district_id }, { enabled: Boolean(form.district_id) });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = S.errors.required;
    if (form.password.length < 6) next.password = S.errors.passwordShort;
    if (form.confirm !== form.password) next.confirm = S.errors.passwordsMismatch;
    for (const key of ["nationality_id", "district_id"] as const) if (!form[key]) next[key] = S.errors.required;
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    setFormError(null);
    try {
      await authPost("register", {
        name: form.name.trim(),
        phone,
        gender: form.gender,
        password: form.password,
        nationality_id: form.nationality_id,
        district_id: form.district_id,
        school_id: form.school_id,
        manager_name: form.manager_name,
      });
      onDone();
    } catch (err) {
      setFormError(errorMessage(err));
      setLoading(false);
    }
  }

  const options = (list: Named[] | undefined) =>
    (list ?? []).map((o) => (
      <option key={o.id} value={o.id}>
        {o.name}
      </option>
    ));

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField wrapperClassName="sm:col-span-2" label={S.auth.name} value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} autoComplete="name" />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-sm font-medium text-ink-2">{S.auth.gender}</span>
        <Segmented
          label={S.auth.gender}
          value={form.gender as "male" | "female"}
          onChange={(v) => set("gender", v)}
          options={[
            { key: "female", label: S.auth.female, activeClass: "bg-primary" },
            { key: "male", label: S.auth.male, activeClass: "bg-primary" },
          ]}
        />
      </div>
      <TextField label={S.auth.password} type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} error={errors.password} />
      <TextField label={S.auth.confirmPassword} type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} error={errors.confirm} />
      <Select label={S.auth.nationality} value={form.nationality_id} onChange={(e) => set("nationality_id", e.target.value)} error={errors.nationality_id}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(lookups.data?.nationalities)}
      </Select>
      <Select label={S.auth.region} value={form.region_id} onChange={(e) => setForm((f) => ({ ...f, region_id: e.target.value, city_id: "", district_id: "", school_id: "" }))}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(lookups.data?.regions)}
      </Select>
      <Select label={S.auth.city} value={form.city_id} disabled={!form.region_id} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value, district_id: "", school_id: "" }))}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(cities.data)}
      </Select>
      <Select label={S.auth.district} value={form.district_id} disabled={!form.city_id} error={errors.district_id} onChange={(e) => setForm((f) => ({ ...f, district_id: e.target.value, school_id: "" }))}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(districts.data)}
      </Select>
      <Select label={S.auth.school} value={form.school_id} disabled={!form.district_id} onChange={(e) => set("school_id", e.target.value)}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(schools.data)}
      </Select>
      <TextField label={`${S.auth.managerName} (${S.common.optional})`} value={form.manager_name} onChange={(e) => set("manager_name", e.target.value)} />
      {formError && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-ink sm:col-span-2" role="alert">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" block loading={loading} className="sm:col-span-2">
        {S.auth.finishRegister}
      </Button>
    </form>
  );
}
