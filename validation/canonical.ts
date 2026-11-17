import { createHash } from "node:crypto";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function normalize(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, JsonValue> = {};
    for (const key of Object.keys(input).sort()) output[key] = normalize(input[key]);
    return output;
  }
  throw new Error(`Unsupported value: ${typeof value}`);
}

export const canonicalize = (value: unknown): string => JSON.stringify(normalize(value));
export const digest = (value: unknown): string => createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
