"use client";

import { useRef } from "react";
import { S } from "@/lib/strings";

/** 4 boxes, typed left to right; paste fills them all. */
export function OtpInput({ value, onChange, length = 4 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const setAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, length));
  };

  return (
    <div className="flex justify-center gap-3" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={S.auth.otpDigit(i + 1)}
          value={d}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (text) {
              e.preventDefault();
              onChange(text);
              refs.current[Math.min(text.length, length - 1)]?.focus();
            }
          }}
          className="h-15 w-14 rounded-xl border-[1.5px] border-line text-center text-2xl font-bold outline-none focus:border-primary"
        />
      ))}
    </div>
  );
}
