import "server-only";

// Reads a request body (JSON or multipart) into one nested object, so the
// mock handlers see `options[0][content]` as `options: [{ content }]`.

export interface ParsedBody {
  fields: Record<string, unknown>;
  files: Record<string, File>;
}

function setPath(target: Record<string, unknown>, key: string, value: unknown) {
  const parts = key.replace(/\]/g, "").split("[");
  let node: Record<string, unknown> | unknown[] = target;
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    const nextIsIndex = !last && /^\d*$/.test(parts[i + 1]);
    const slot = part === "" && Array.isArray(node) ? node.length : part;
    const container = node as Record<string, unknown>;
    if (last) {
      container[slot] = value;
    } else {
      container[slot] ??= nextIsIndex ? [] : {};
      node = container[slot] as Record<string, unknown>;
    }
  });
}

export async function parseBody(request: Request): Promise<ParsedBody> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const fields: Record<string, unknown> = {};
    const files: Record<string, File> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") setPath(fields, key, value);
      else {
        files[key] = value;
        setPath(fields, key, value.name);
      }
    }
    return { fields, files };
  }
  try {
    const json = (await request.json()) as unknown;
    return { fields: json && typeof json === "object" ? (json as Record<string, unknown>) : {}, files: {} };
  } catch {
    return { fields: {}, files: {} };
  }
}
