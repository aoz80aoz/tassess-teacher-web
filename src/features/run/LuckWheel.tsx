"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { S } from "@/lib/strings";

const COLORS = ["var(--color-primary)", "var(--color-accent-200)", "var(--color-info)", "var(--color-success-soft)"];

/** Picks a student at random; the pointer sits on the wheel's top edge. */
export function LuckWheel({ students }: { students: { id: number; name: string }[] }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const turns = useRef(0);
  const n = Math.max(students.length, 1);
  const slice = 360 / n;
  const gradient = students.length ? students.map((_, i) => `${COLORS[i % COLORS.length]} ${i * slice}deg ${(i + 1) * slice}deg`).join(", ") : "var(--color-soft) 0 360deg";

  function spin() {
    if (!students.length) return;
    const index = Math.floor(Math.random() * students.length);
    turns.current += 5;
    // Bring the chosen slice's centre under the top pointer.
    setRotation(turns.current * 360 - (index * slice + slice / 2));
    setSpinning(true);
    setPicked(null);
    setTimeout(() => {
      setSpinning(false);
      setPicked(students[index].name);
    }, 3200);
  }

  return (
    <Card className="flex flex-col items-center gap-3.5">
      <strong className="self-start">{S.run.wheel}</strong>
      <div className="relative size-56">
        <div className="absolute -top-1.5 start-1/2 z-10 -translate-x-1/2 border-x-[10px] border-t-[18px] border-x-transparent border-t-accent rtl:translate-x-1/2" aria-hidden="true" />
        <div
          className="size-56 rounded-full border-[6px] border-white shadow-[0_0_0_1px_var(--color-line)]"
          style={{ background: `conic-gradient(${gradient})`, transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 3.2s cubic-bezier(.17,.67,.2,1)" : "none" }}
          aria-hidden="true"
        />
        <div className="absolute inset-[78px] grid place-items-center rounded-full bg-white p-1 text-center text-xs font-bold shadow" aria-live="polite">
          {spinning ? S.run.spinning : picked ?? ""}
        </div>
      </div>
      {picked && !spinning && <p className="font-semibold text-primary">{S.run.picked(picked)}</p>}
      <Button block onClick={spin} disabled={spinning || !students.length}>
        {S.run.spin}
      </Button>
    </Card>
  );
}
