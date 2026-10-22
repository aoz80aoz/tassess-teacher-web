import type { Metadata } from "next";
import { DashboardShell } from "@/features/shell/DashboardShell";

// The dashboard is private: never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/app">) {
  return <DashboardShell>{children}</DashboardShell>;
}
