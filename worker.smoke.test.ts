import { describe, expect, it } from "vitest";
import worker from "../src/index";

const BASE = "https://tmo-api.test";
const get = (path: string) => new Request(`${BASE}${path}`);
const postJson = (path: string, body: unknown) => new Request(`${BASE}${path}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const emptyLE = () => ({
  temporalEntities: [], provenanceRecords: [], sourceRecords: [], events: [],
  propositions: [], assertions: [], evidence: [], derivations: [], relations: [],
});

describe("tmo-api automated smoke suite", () => {
  it("GET /health returns 200", async () => {
    const r = await worker.fetch(get("/health"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, service: "tmo-api" });
  });

  it("GET /v1/version advertises the stable contracts", async () => {
    const r = await worker.fetch(get("/v1/version"));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      ok: true, service: "tmo-api", coreVersion: "1.0.0",
      schemaVersion: "1.0.0", profiles: { LE: "1.0.0" },
    });
  });

  it("TMO-106 rejects SECOND output derived from SECOND + DAY", async () => {
    const r = await worker.fetch(postJson("/v1/core/temporal", {
      inputs: [
        { id: "precise", form: "INSTANT", precision: "SECOND", sourceIds: [] },
        { id: "coarse", form: "INSTANT", precision: "DAY", sourceIds: [] },
      ],
      output: { id: "out", form: "INSTANT", precision: "SECOND", sourceIds: [] },
    }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, result: { status: "INVALID" } });
  });

  it("accepts representation of unsupported relation and leaves semantics to Core", async () => {
    const r = await worker.fetch(postJson("/v1/core/relation", {
      id: "r1", kind: "AUTHORIZATION", fromId: "a", toId: "b",
      sourceIds: [], qualification: "ASSERTED",
    }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, result: { status: "INVALID" } });
  });

  it("rejects incomplete LE record sets with path-aware issues", async () => {
    const r = await worker.fetch(postJson("/v1/le/evaluate", { temporalEntities: [] }));
    expect(r.status).toBe(400);
    const body = await r.json() as any;
    expect(body).toMatchObject({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid LE record set" } });
    expect(body.error.issues.some((x: any) => x.path === "$.provenanceRecords")).toBe(true);
  });

  it("rejects malformed nested temporal precision", async () => {
    const body = emptyLE();
    body.temporalEntities.push({ id: "t1", precision: "NANOSECOND", sourceIds: [] } as never);
    const r = await worker.fetch(postJson("/v1/le/evaluate", body));
    expect(r.status).toBe(400);
    const response = await r.json() as any;
    expect(response.error.issues.some((x: any) => x.path === "$.temporalEntities[0].precision")).toBe(true);
  });

  it("rejects malformed JSON", async () => {
    const r = await worker.fetch(new Request(`${BASE}/v1/le/evaluate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{",
    }));
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ ok: false, error: { code: "INVALID_JSON" } });
  });

  it("rejects a non-JSON content type", async () => {
    const r = await worker.fetch(new Request(`${BASE}/v1/le/evaluate`, {
      method: "POST", headers: { "content-type": "text/plain" }, body: "{}",
    }));
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ ok: false, error: { code: "INVALID_REQUEST" } });
  });

  it("returns 405 for the wrong method on an evaluation route", async () => {
    const r = await worker.fetch(get("/v1/le/evaluate"));
    expect(r.status).toBe(405);
    expect(await r.json()).toMatchObject({ ok: false, error: { code: "METHOD_NOT_ALLOWED" } });
  });

  it("returns 404 for unknown routes", async () => {
    const r = await worker.fetch(get("/not-a-route"));
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
