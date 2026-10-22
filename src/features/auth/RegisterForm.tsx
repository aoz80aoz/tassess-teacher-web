"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, CountryPhoneField, intlPhone, isValidIntlPhone, TextField, type IntlPhone } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Tabs";
import { api, errorMessage, toFormData } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { track } from "@/lib/analytics";
import { S } from "@/lib/strings";
import { authPost } from "./auth-api";
import { OtpInput } from "./OtpInput";
import { emptySchool, MAX_PHOTO, NationalitySelect, PhotoField, SchoolFields, type SchoolValue } from "./ProfileFields";

// The app's order (auth_screen.dart): details → school → OTP (send/otp,
// verify/otp) → register. Every call goes to the real API.

type Step = "details" | "school" | "otp";
type OtpType = "whatsapp" | "sms";
const RESEND_SECONDS = 60;

interface Details {
  phone: IntlPhone;
  name: string;
  manager_name: string;
  nationality_id: string;
  gender: "male" | "female";
  password: string;
  confirm: string;
  otpType: OtpType;
  agreed: boolean;
}

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<Details>({ phone: { code: "+966", digits: "" }, name: "", manager_name: "", nationality_id: "", gender: "male", password: "", confirm: "", otpType: "whatsapp", agreed: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [school, setSchool] = useState<SchoolValue>(emptySchool);
  const [code, setCode] = useState("");
  // Verified codes are used up: a register retry must not verify again.
  const [verified, setVerified] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const phone = intlPhone(details.phone);
  const set = <K extends keyof Details>(key: K, value: Details[K]) => setDetails((d) => ({ ...d, [key]: value }));

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function submitDetails(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isValidIntlPhone(details.phone)) next.phone = S.errors.invalidPhoneIntl;
    if (!details.name.trim()) next.name = S.errors.required;
    if (!details.nationality_id) next.nationality_id = S.errors.required;
    if (details.password.length < 6) next.password = S.errors.passwordShort;
    if (details.confirm !== details.password) next.confirm = S.errors.passwordsMismatch;
    if (photo && photo.size > MAX_PHOTO) next.photo = S.auth.photoTooLarge;
    if (!details.agreed) next.agreed = S.auth.mustAgree;
    setErrors(next);
    setFormError(null);
    if (!Object.keys(next).length) setStep("school");
  }

  async function sendCode() {
    setLoading(true);
    setFormError(null);
    try {
      await api(Endpoints.sendTeacherOtp, { phone, type: details.otpType });
      setStep("otp");
      setCode("");
      setVerified(false);
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function submitSchool(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!school.district_id) next.district_id = S.errors.required;
    if (!school.school_id && !school.school_name.trim()) next.school_id = next.school_name = S.auth.schoolRequired;
    setErrors(next);
    if (!Object.keys(next).length) void sendCode();
  }

  async function verifyAndRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    try {
      if (!verified) {
        await api(Endpoints.verifyTeacherOtp, { phone, code });
        setVerified(true);
      }
      // The Postman "Register" body, multipart so the photo goes along.
      await authPost(
        "register",
        toFormData({
          name: details.name.trim(),
          phone,
          gender: details.gender,
          password: details.password,
          district_id: school.district_id,
          nationality_id: details.nationality_id,
          school_id: school.school_id || undefined,
          img: photo ?? undefined,
          school_name: school.school_id ? undefined : school.school_name.trim(),
          manager_name: details.manager_name.trim() || undefined,
        }),
      );
      track("sign_up", { method: "phone" });
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
      setLoading(false);
    }
  }

  const stepIndex = step === "details" ? 1 : step === "school" ? 2 : 3;
  const stepLabel = step === "details" ? S.auth.stepDetails : step === "school" ? S.auth.stepSchool : S.auth.stepOtp;
  const errorBox = formError && (
    <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-ink sm:col-span-2" role="alert">
      {formError}
    </p>
  );

  return (
    <div className="flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-line bg-white p-8">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-accent">{S.auth.stepOf(stepIndex, stepLabel)}</span>
        <h1 className="text-[26px] font-bold">{step === "otp" ? S.auth.otpTitle : step === "school" ? S.auth.schoolTitle : S.auth.registerTitle}</h1>
        <p className="text-muted">{step === "otp" ? S.auth.otpSent(phone) : S.auth.registerSubtitle}</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 rounded-full ${n <= stepIndex ? "bg-primary" : "bg-soft"}`} />
          ))}
        </div>
      </div>

      {step === "details" && (
        <form onSubmit={submitDetails} noValidate className="grid gap-4 sm:grid-cols-2">
          <CountryPhoneField wrapperClassName="sm:col-span-2" label={S.auth.phone} value={details.phone} onChange={(v) => set("phone", v)} placeholder={S.auth.phonePlaceholder} error={errors.phone} autoFocus />
          <TextField wrapperClassName="sm:col-span-2" label={S.auth.name} value={details.name} onChange={(e) => set("name", e.target.value)} error={errors.name} autoComplete="name" />
          <TextField wrapperClassName="sm:col-span-2" label={`${S.auth.managerName} (${S.common.optional})`} value={details.manager_name} onChange={(e) => set("manager_name", e.target.value)} />
          <NationalitySelect value={details.nationality_id} onChange={(v) => set("nationality_id", v)} error={errors.nationality_id} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-2">{S.auth.gender}</span>
            <Segmented
              label={S.auth.gender}
              value={details.gender}
              onChange={(v) => set("gender", v)}
              options={[
                { key: "male", label: S.auth.male, activeClass: "bg-primary" },
                { key: "female", label: S.auth.female, activeClass: "bg-primary" },
              ]}
            />
          </div>
          <TextField label={S.auth.password} type="password" autoComplete="new-password" value={details.password} onChange={(e) => set("password", e.target.value)} error={errors.password} />
          <TextField label={S.auth.confirmPassword} type="password" autoComplete="new-password" value={details.confirm} onChange={(e) => set("confirm", e.target.value)} error={errors.confirm} />
          <PhotoField file={photo} onChange={setPhoto} error={errors.photo} />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-ink-2">{S.auth.otpChannel}</span>
            <Segmented
              label={S.auth.otpChannel}
              value={details.otpType}
              onChange={(v) => set("otpType", v)}
              options={[
                { key: "whatsapp", label: S.auth.whatsapp, activeClass: "bg-primary" },
                { key: "sms", label: S.auth.sms, activeClass: "bg-primary" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Checkbox label={S.auth.agreeTerms} checked={details.agreed} onChange={(e) => set("agreed", e.target.checked)} />
            <Link href="/terms" target="_blank" className="text-sm text-primary hover:underline">
              {S.auth.viewTerms}
            </Link>
            {errors.agreed && (
              <p className="text-sm text-danger" role="alert">
                {errors.agreed}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" block className="sm:col-span-2">
            {S.auth.continue}
          </Button>
        </form>
      )}

      {step === "school" && (
        <form onSubmit={submitSchool} noValidate className="grid gap-4 sm:grid-cols-2">
          <SchoolFields value={school} onChange={setSchool} allowCustom errors={errors} />
          {errorBox}
          <Button type="submit" size="lg" block loading={loading} className="sm:col-span-2">
            {S.auth.sendCode}
          </Button>
          <Button variant="ghost" className="sm:col-span-2" onClick={() => setStep("details")}>
            {S.auth.back}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyAndRegister} className="flex flex-col gap-5">
          <OtpInput value={code} onChange={setCode} />
          {errorBox}
          <Button type="submit" size="lg" block loading={loading} disabled={code.length < 4}>
            {S.auth.finishRegister}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className="min-h-11 text-primary" onClick={() => setStep("details")}>
              {S.auth.changePhone}
            </button>
            {seconds > 0 ? (
              <span className="text-muted">{S.auth.resendIn(seconds)}</span>
            ) : (
              <button type="button" className="min-h-11 text-primary" disabled={loading} onClick={() => void sendCode()}>
                {S.auth.resend}
              </button>
            )}
          </div>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        {S.auth.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {S.auth.loginButton}
        </Link>
      </p>
    </div>
  );
}
