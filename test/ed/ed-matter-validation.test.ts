import { describe, expect, it } from "vitest";
import { validateEDMatter, type EDMatterGraph, type EDStageResult } from "../../src/profiles/ed/ed-matter-validation.js";

const stage = (
  name: EDStageResult["stage"],
  status: string,
  inputResourceIds: readonly string[],
  outputResourceIds: readonly string[],
  authorizationAction?: string
): EDStageResult => ({
  stage: name,
  status,
  matterId: "matter-1",
  resourceIds: [`stage:${name}`],
  inputResourceIds,
  outputResourceIds,
  authorizationAction,
  authorizationStatus: authorizationAction ? "AUTHORIZED" : undefined,
  reasons: [],
  limitations: []
});

function validGraph(): EDMatterGraph {
  const source = "source-1";
  const item = "item-1";
  const processed = "repr-processed";
  const redacted = "repr-redacted";
  const produced = "repr-produced";

  return {
    matterId: "matter-1",
    dataSourceIds: [source],
    collectedItemIds: [item],
    representationIds: [processed, redacted, produced],
    activeHoldResourceIds: [],
    stages: [
      stage("preservation", "PRESERVED", [source], ["stage:preservation"], "PRESERVE"),
      stage("collection", "COLLECTED", [source], [item], "COLLECT"),
      stage("processing", "PROCESSED", [item], [processed], "PROCESS"),
      stage("review", "REVIEWED", [item], ["stage:review"], "REVIEW"),
      stage("privilege", "VALID", [item], ["stage:privilege"], "REVIEW"),
      stage("redaction", "REDACTED", [processed], [redacted], "REDACT"),
      stage("analysis", "ASSESSED", [item], ["stage:analysis"], "ANALYZE"),
      stage("requestResponse", "RESPONDED", ["stage:review"], ["stage:requestResponse"]),
      stage("production", "PRODUCED", [redacted], [produced], "PRODUCE"),
      stage("disposition", "NOT_DISPOSED", [produced], ["stage:disposition"])
    ],
    edToLeInputs: [{
      id: item,
      type: "EDCollectedItem",
      matterId: "matter-1",
      originId: "origin-1",
      representationRef: "r2://matter/item-1",
      parentIds: [source],
      occurredAt: "2026-11-21T12:00:00Z",
      status: "COLLECTED",
      sourceRecordIds: ["record-1"],
      exceptionIds: []
    }]
  };
}

describe("TMO-ED matter validation", () => {
  it("validates a complete matter graph", () => {
    expect(validateEDMatter(validGraph()).status).toBe("VALID");
  });

  it("rejects cross-matter stage leakage", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 1 ? { ...item, matterId: "matter-2" } : item) };
    expect(validateEDMatter(altered).status).toBe("INVALID");
  });

  it("rejects missing cross-stage lineage", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 2 ? { ...item, inputResourceIds: ["missing"] } : item) };
    expect(validateEDMatter(altered).status).toBe("INVALID");
  });

  it("rejects wrong action authorization", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 1 ? { ...item, authorizationAction: "PRESERVE" } : item) };
    expect(validateEDMatter(altered).status).toBe("INVALID");
  });

  it("rejects revoked authorization", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 8 ? { ...item, authorizationStatus: "REVOKED" } : item) };
    expect(validateEDMatter(altered).status).toBe("INVALID");
  });

  it("preserves indeterminate stage status", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 3 ? { ...item, status: "INDETERMINATE" } : item) };
    expect(validateEDMatter(altered).status).toBe("INDETERMINATE");
  });

  it("preserves indeterminate authorization", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 6 ? { ...item, authorizationStatus: "INDETERMINATE" } : item) };
    expect(validateEDMatter(altered).status).toBe("INDETERMINATE");
  });

  it("returns VALID_WITH_LIMITATIONS for partial processing", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 2 ? { ...item, status: "PARTIALLY_PROCESSED" } : item) };
    expect(validateEDMatter(altered).status).toBe("VALID_WITH_LIMITATIONS");
  });

  it("gives invalid stage precedence over indeterminate stages", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.map((item, index) => index === 1 ? { ...item, status: "INVALID", reasons: ["Collection lineage failed."] } : index === 3 ? { ...item, status: "INDETERMINATE" } : item) };
    expect(validateEDMatter(altered).status).toBe("INVALID");
  });

  it("blocks disposition against an active hold", () => {
    const graph = validGraph();
    const altered = { ...graph, activeHoldResourceIds: ["repr-produced"], stages: graph.stages.map((item, index) => index === 9 ? { ...item, status: "DISPOSED" } : item) };
    expect(validateEDMatter(altered).status).toBe("INVALID");
  });

  it("rejects duplicate canonical resource references", () => {
    const graph = validGraph();
    const altered = { ...graph, collectedItemIds: ["item-1", "item-1"] };
    expect(validateEDMatter(altered).status).toBe("INVALID");
  });

  it("does not promote collection to LE support", () => {
    const result = validateEDMatter(validGraph());
    expect(result.edToLe.qualifications[0]?.evidence).toBe("INDETERMINATE");
  });

  it("keeps produced and collected representations separate", () => {
    const graph = validGraph();
    expect(graph.collectedItemIds[0]).not.toBe(graph.representationIds[2]);
    expect(validateEDMatter(graph).status).toBe("VALID");
  });

  it("reports missing lifecycle stages", () => {
    const graph = validGraph();
    const altered = { ...graph, stages: graph.stages.filter((item) => item.stage !== "privilege") };
    expect(validateEDMatter(altered).status).toBe("VALID_WITH_LIMITATIONS");
  });

  it("propagates ED-to-LE mapping limitations", () => {
    const graph = validGraph();
    const altered = { ...graph, edToLeInputs: [{ ...graph.edToLeInputs[0]!, representationRef: undefined, sourceRef: undefined }] };
    expect(validateEDMatter(altered).status).toBe("VALID_WITH_LIMITATIONS");
  });
});
