import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import { S } from "@/lib/strings";

export const metadata: Metadata = { title: S.auth.forgotTitle };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
