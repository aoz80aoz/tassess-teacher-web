"use client";

import { useEffect, useState } from "react";

// The teacher's preferred text size for lesson texts (0.8–1.6), kept per
// browser like SessionTextScaleCubit in the app.

const KEY = "tt_session_text_scale";

export function useTextScale() {
  const [scale, setScale] = useState(1.1);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved >= 0.8 && saved <= 1.6) setScale(saved);
    } catch {}
  }, []);
  const update = (value: number) => {
    const v = Math.max(0.8, Math.min(1.6, value));
    setScale(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {}
  };
  return [scale, update] as const;
}
