import { describe, expect, it } from "vitest";
import { mapEDToLE, type EDToLEInput } from "../../src/profiles/ed/ed-to-le.js";

const collected = (): EDToLEInput => ({
  id: "collected-1", type: "EDCollectedItem", matterId: "matter-1", originId: "origin-1",
  sourceRef: "source-ref-1", representationRef: "r2://matter/item-1", parentIds: ["source-1"],
  occurredAt: "2026-11-21T12:00:00Z", status: "COLLECTED", sourceRecordIds: ["record-1"], exceptionIds: []
});

describe("TMO ED to LE bridge", () => {
  it("maps a collected representation to LE source and provenance", () => {
    const result = mapEDToLE([collected()]);
    expect(result.sourceRecords).toHaveLength(1);
    expect(result.provenanceRecords).toHaveLength(1);
  });

  it("does not map COLLECTED to supported evidence", () => {
    const result = mapEDToLE([collected()]);
    expect(result.qualifications[0]?.evidence).toBe("INDETERMINATE");
  });

  it("creates an audit boundary for collected workflow state", () => {
    const result = mapEDToLE([collected()]);
    expect(result.auditFindings[0]?.status).toBe("INDETERMINATE");
  });

  it("preserves exact provided timestamp as a temporal entity", () => {
    const result = mapEDToLE([collected()]);
    expect(result.temporalEntities[0]?.earliest).toBe("2026-11-21T12:00:00Z");
  });

  it("does not manufacture time when ED time is unresolved", () => {
    const result = mapEDToLE([{ ...collected(), occurredAt: "unknown" }]);
    expect(result.temporalEntities).toHaveLength(0);
    expect(result.uncertainties.some((x) => x.id.includes("time"))).toBe(true);
  });

  it("maps processing to a derivation", () => {
    const input: EDToLEInput = { ...collected(), id: "process-1", type: "EDProcessingEvent", operation: "OCR", representationRef: "text-1" };
    const result = mapEDToLE([input]);
    expect(result.derivations[0]?.kind).toBe("EXTRACTION");
  });

  it("maps deduplication to association, not provenance independence", () => {
    const input: EDToLEInput = { ...collected(), id: "dedupe-1", type: "EDProcessingEvent", operation: "DEDUPLICATION_GROUPING" };
    const result = mapEDToLE([input]);
    expect(result.derivations[0]?.kind).toBe("ASSOCIATION");
    expect(result.provenanceRecords).toHaveLength(0);
  });

  it("maps redaction to an explicit derivation", () => {
    const input: EDToLEInput = { ...collected(), id: "redact-1", type: "EDRedaction", operation: "REDACTION" };
    expect(mapEDToLE([input]).derivations[0]?.kind).toBe("REDACTION");
  });

  it("keeps responsive review status from becoming truth", () => {
    const input: EDToLEInput = { ...collected(), id: "review-1", type: "EDReviewDecision", status: "RESPONSIVE" };
    const result = mapEDToLE([input]);
    expect(result.qualifications[0]?.evidence).toBe("INDETERMINATE");
    expect(result.auditFindings).toHaveLength(1);
  });

  it("keeps produced status from becoming authenticity", () => {
    const input: EDToLEInput = { ...collected(), id: "prod-1", type: "EDProductionItem", status: "PRODUCED" };
    const result = mapEDToLE([input]);
    expect(result.qualifications[0]?.evidence).toBe("INDETERMINATE");
  });

  it("maps ED exceptions to LE uncertainty", () => {
    const input: EDToLEInput = { ...collected(), id: "exception-1", type: "EDException", status: "INDETERMINATE" };
    expect(mapEDToLE([input]).uncertainties.length).toBeGreaterThan(0);
  });

  it("preserves analysis as derived and not established fact", () => {
    const input: EDToLEInput = { ...collected(), id: "analysis-1", type: "EDAnalysis", operation: "GENERATIVE_AI", status: "SUPPORTED" };
    const result = mapEDToLE([input]);
    expect(result.qualifications[0]?.origin).toBe("DERIVED");
    expect(result.qualifications[0]?.evidence).toBe("INDETERMINATE");
  });

  it("rejects duplicate ED resource IDs", () => {
    expect(mapEDToLE([collected(), collected()]).status).toBe("INVALID");
  });

  it("rejects duplicate lineage references", () => {
    expect(mapEDToLE([{ ...collected(), parentIds: ["source-1", "source-1"] }]).status).toBe("INVALID");
  });

  it("returns mapping limitations when representation address is missing", () => {
    const input: EDToLEInput = { ...collected(), representationRef: undefined, sourceRef: undefined };
    expect(mapEDToLE([input]).status).toBe("MAPPED_WITH_LIMITATIONS");
  });
});
