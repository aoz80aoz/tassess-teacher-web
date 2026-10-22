"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { S } from "@/lib/strings";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-14 text-center" role="alert">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
        <Icon name="alert" className="size-7" />
      </span>
      <p className="font-semibold">{S.errors.pageError}</p>
      <Button variant="outline" icon="reset" onClick={reset}>
        {S.common.retry}
      </Button>
    </div>
  );
}
