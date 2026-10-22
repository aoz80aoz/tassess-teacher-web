import { S } from "@/lib/strings";

/** Shown only while the site answers from dummy data (see USE_MOCK_API). */
export function DemoHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm leading-6 text-warning-ink">{S.auth.demoHint}</p>;
}
