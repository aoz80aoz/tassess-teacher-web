// Saves a file the browser received (export, invoice, template).

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV with a BOM so Excel opens Arabic correctly. */
export function saveCsv(rows: (string | number | null | undefined)[][], fileName: string) {
  const escape = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(escape).join(",")).join("\n");
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), fileName.endsWith(".csv") ? fileName : `${fileName}.csv`);
}

export function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
