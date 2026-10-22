// Production entry point for the standalone build (see deploy/README.md).
//
// The site's public address (canonical links, WhatsApp/Open Graph image,
// sitemap) is baked into the static pages at build time. The build uses a
// placeholder, and this script swaps it for SITE_URL before starting
// server.js, so one build runs on any domain. It remembers what it applied,
// so changing SITE_URL and restarting is enough.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER = "https://site-url.placeholder.invalid";
const APPLIED = join(ROOT, ".next", ".site-url");
const TEXT = new Set([".html", ".rsc", ".json", ".js", ".body", ".meta", ".txt", ".xml"]);

// .env next to this file (KEY=value lines); real environment variables win.
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trimStart().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
if (!/^https?:\/\/[^/]+$/.test(siteUrl)) {
  console.error("[start] SITE_URL must be the site's address, e.g. https://hessaty.taseese.org");
  process.exit(1);
}
if (!process.env.API_KEY) console.warn("[start] API_KEY is empty: the backend will refuse every call.");

const from = existsSync(APPLIED) ? readFileSync(APPLIED, "utf8").trim() : PLACEHOLDER;
if (from !== siteUrl) {
  let changed = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (TEXT.has(extname(name))) {
        const text = readFileSync(path, "utf8");
        if (text.includes(from)) {
          writeFileSync(path, text.split(from).join(siteUrl));
          changed++;
        }
      }
    }
  };
  walk(join(ROOT, ".next"));
  writeFileSync(APPLIED, siteUrl);
  console.log(`[start] site address set to ${siteUrl} (${changed} files)`);
}

process.env.NEXT_PUBLIC_SITE_URL = siteUrl;
await import("./server.js");
