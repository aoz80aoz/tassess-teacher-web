import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/RegisterForm";
import { serverConfig } from "@/server/config";
import { S } from "@/lib/strings";

// Unlike login, registration is a landing target for campaigns: indexable.
export const metadata: Metadata = {
  title: S.seo.registerTitle,
  robots: { index: true, follow: true },
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return <RegisterForm demo={serverConfig.useMocks} />;
}
