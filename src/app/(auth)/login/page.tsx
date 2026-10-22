import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/LoginForm";
import { serverConfig } from "@/server/config";
import { S } from "@/lib/strings";

export const metadata: Metadata = { title: S.seo.loginTitle };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm demo={serverConfig.useMocks} />
    </Suspense>
  );
}
