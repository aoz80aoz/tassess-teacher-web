import { Chip } from "@/components/ui/Card";
import type { SessionStatus } from "@/lib/api/types";
import { S } from "@/lib/strings";

const TONE = { pending: "info", in_progress: "warning", completed: "success" } as const;

export function SessionStatusChip({ status, prepared }: { status: SessionStatus; prepared?: boolean }) {
  if (status === "pending" && prepared === false) return <Chip tone="danger">{S.status.notPrepared}</Chip>;
  return <Chip tone={TONE[status]}>{S.status[status]}</Chip>;
}

/** Performance bar colour: green at the 60% pass line and above (PassLine in the app). */
export const PASS_LINE = 60;
export const performanceColor = (p: number) => (p >= PASS_LINE ? "var(--color-success)" : "var(--color-danger)");
