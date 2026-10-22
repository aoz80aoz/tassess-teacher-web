"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import type { DistributionResult } from "@/lib/api/types";
import { percent } from "@/lib/format";
import { S } from "@/lib/strings";

function Timer() {
  const [seconds, setSeconds] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, seconds]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary px-5 py-3 text-white">
      <span className="text-sm">{S.run.timer}</span>
      <span className="flex-1 text-3xl font-bold" dir="ltr">
        {mm}:{ss}
      </span>
      <Button variant="onDark" size="sm" icon={running ? "pause" : "play"} onClick={() => setRunning((r) => !r)}>
        {running ? S.run.pauseTimer : S.run.startTimer}
      </Button>
      <Button
        variant="onDark"
        size="sm"
        icon="reset"
        onClick={() => {
          setRunning(false);
          setSeconds(5 * 60);
        }}
      >
        {S.run.resetTimer}
      </Button>
    </div>
  );
}

export function KaganDialog({ open, onClose, sessionId }: { open: boolean; onClose: () => void; sessionId: number }) {
  const toast = useToast();
  const [size, setSize] = useState("4");
  const [result, setResult] = useState<DistributionResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function distribute() {
    setLoading(true);
    try {
      setResult(await api<DistributionResult>(Endpoints.classSessionDistributeStudents, { session_id: sessionId, group_size: Number(size) || 4 }));
    } catch (e) {
      toast.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={S.run.kagan} size="xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <TextField wrapperClassName="w-48" label={S.run.groupSize} inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          <Button loading={loading} onClick={distribute}>
            {S.run.distribute}
          </Button>
        </div>
        <Timer />
        {result && (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {result.groups.map((g) => (
              <Card key={g.group_number} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <strong>{S.run.groupN(g.group_number)}</strong>
                  <span className="text-xs text-muted">{S.run.groupAverage(percent(g.average_performance))}</span>
                </div>
                <ul className="flex flex-col gap-1 text-sm">
                  {g.members.map((m) => (
                    <li key={m.id} className="rounded-lg bg-surface px-3 py-2">
                      {m.name}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
