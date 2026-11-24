import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  validateEDMatter,
  type EDMatterGraph,
  type EDIntegratedStage,
  type EDStageResult
} from "../../src/profiles/ed/ed-matter-validation.js";

const requiredStages: readonly EDIntegratedStage[] = [
  "preservation", "collection", "processing", "review", "privilege",
  "redaction", "analysis", "requestResponse", "production", "disposition"
];

const actionByStage: Partial<Record<EDIntegratedStage, string>> = {
  preservation: "PRESERVE",
  collection: "COLLECT",
  processing: "PROCESS",
  review: "REVIEW",
  privilege: "REVIEW",
  redaction: "REDACT",
  analysis: "ANALYZE",
  production: "PRODUCE"
};

const statusByStage: Record<EDIntegratedStage, string> = {
  preservation: "PRESERVED",
  collection: "COLLECTED",
  processing: "PROCESSED",
  review: "REVIEWED",
  privilege: "VALID",
  redaction: "REDACTED",
  analysis: "ASSESSED",
  requestResponse: "RESPONDED",
  production: "PRODUCED",
  disposition: "NOT_DISPOSED"
};

const stage = (
  name: EDIntegratedStage,
  inputResourceIds: readonly string[],
  outputResourceIds: readonly string[]
): EDStageResult => {
  const action = actionByStage[name];
  return {
    stage: name,
    status: statusByStage[name],
    matterId: "matter-1",
    resourceIds: [`stage:${name}`],
    inputResourceIds,
    outputResourceIds,
    authorizationAction: action,
    authorizationStatus: action ? "AUTHORIZED" : undefined,
    reasons: [],
    limitations: []
  };
};

function baseline(): EDMatterGraph {
  return {
    matterId: "matter-1",
    dataSourceIds: ["source-1"],
    collectedItemIds: ["item-1"],
    representationIds: ["repr-processed", "repr-redacted", "repr-produced"],
    activeHoldResourceIds: [],
    stages: [
      stage("preservation", ["source-1"], ["stage:preservation"]),
      stage("collection", ["source-1"], ["item-1"]),
      stage("processing", ["item-1"], ["repr-processed"]),
      stage("review", ["item-1"], ["stage:review"]),
      stage("privilege", ["item-1"], ["stage:privilege"]),
      stage("redaction", ["repr-processed"], ["repr-redacted"]),
      stage("analysis", ["item-1"], ["stage:analysis"]),
      stage("requestResponse", ["stage:review"], ["stage:requestResponse"]),
      stage("production", ["repr-redacted"], ["repr-produced"]),
      stage("disposition", ["repr-produced"], ["stage:disposition"])
    ],
    edToLeInputs: [{
      id: "item-1",
      type: "EDCollectedItem",
      matterId: "matter-1",
      originId: "origin-1",
      representationRef: "r2://matter-1/item-1.eml",
      parentIds: ["source-1"],
      occurredAt: "2026-11-21T12:00:00Z",
      status: "COLLECTED",
      sourceRecordIds: ["source-record-1"],
      exceptionIds: []
    }]
  };
}

const replaceStage = (
  graph: EDMatterGraph,
  name: EDIntegratedStage,
  update: (stage: EDStageResult) => EDStageResult
): EDMatterGraph => ({
  ...graph,
  stages: graph.stages.map((item) => item.stage === name ? update(item) : item)
});

const operationalStageArb = fc.constantFrom(
  "preservation", "collection", "processing", "review",
  "privilege", "redaction", "analysis", "production"
) as fc.Arbitrary<EDIntegratedStage>;

const forbiddenAuthorizationArb = fc.constantFrom(
  "NOT_AUTHORIZED", "EXPIRED", "REVOKED"
);

const partialStatusArb = fc.constantFrom(
  "PARTIALLY_PRESERVED",
  "PARTIALLY_COLLECTED",
  "PARTIALLY_PROCESSED",
  "PARTIALLY_REVIEWED",
  "PARTIALLY_REDACTED",
  "PARTIALLY_ASSESSED",
  "PARTIALLY_RESPONDED",
  "PARTIALLY_PRODUCED",
  "PARTIALLY_DISPOSED"
);

describe("TMO-ED lifecycle properties", () => {
  it("baseline lifecycle is valid", () => {
    expect(validateEDMatter(baseline()).status).toBe("VALID");
  });

  it("any cross-matter stage mutation is invalid", () => {
    fc.assert(fc.property(
      fc.constantFrom(...requiredStages),
      fc.string({ minLength: 1 }).filter((value) => value !== "matter-1"),
      (stageName, foreignMatter) => {
        const graph = replaceStage(baseline(), stageName, (item) => ({ ...item, matterId: foreignMatter }));
        expect(validateEDMatter(graph).status).toBe("INVALID");
      }
    ));
  });

  it("any unknown lifecycle input is invalid", () => {
    fc.assert(fc.property(
      fc.constantFrom(...requiredStages),
      fc.string({ minLength: 1 }).filter((value) => !value.startsWith("stage:") && !["source-1", "item-1", "repr-processed", "repr-redacted", "repr-produced"].includes(value)),
      (stageName, unknownId) => {
        const graph = replaceStage(baseline(), stageName, (item) => ({ ...item, inputResourceIds: [unknownId] }));
        expect(validateEDMatter(graph).status).toBe("INVALID");
      }
    ));
  });

  it("forbidden authorization states always invalidate operational stages", () => {
    fc.assert(fc.property(
      operationalStageArb,
      forbiddenAuthorizationArb,
      (stageName, authorizationStatus) => {
        const graph = replaceStage(baseline(), stageName, (item) => ({ ...item, authorizationStatus }));
        expect(validateEDMatter(graph).status).toBe("INVALID");
      }
    ));
  });

  it("indeterminate authorization never becomes valid", () => {
    fc.assert(fc.property(operationalStageArb, (stageName) => {
      const graph = replaceStage(baseline(), stageName, (item) => ({ ...item, authorizationStatus: "INDETERMINATE" }));
      expect(validateEDMatter(graph).status).toBe("INDETERMINATE");
    }));
  });

  it("wrong action authorization cannot substitute across stages", () => {
    fc.assert(fc.property(
      operationalStageArb,
      fc.constantFrom("PRESERVE", "COLLECT", "PROCESS", "REVIEW", "REDACT", "ANALYZE", "PRODUCE"),
      (stageName, action) => {
        fc.pre(action !== actionByStage[stageName]);
        const graph = replaceStage(baseline(), stageName, (item) => ({ ...item, authorizationAction: action }));
        expect(validateEDMatter(graph).status).toBe("INVALID");
      }
    ));
  });

  it("partial stage states never become fully valid", () => {
    fc.assert(fc.property(
      fc.constantFrom(...requiredStages),
      partialStatusArb,
      (stageName, status) => {
        const graph = replaceStage(baseline(), stageName, (item) => ({ ...item, status }));
        expect(validateEDMatter(graph).status).toBe("VALID_WITH_LIMITATIONS");
      }
    ));
  });

  it("an invalid stage always outranks an indeterminate stage", () => {
    fc.assert(fc.property(
      fc.constantFrom(...requiredStages),
      fc.constantFrom(...requiredStages),
      (invalidStage, uncertainStage) => {
        fc.pre(invalidStage !== uncertainStage);
        let graph = replaceStage(baseline(), invalidStage, (item) => ({ ...item, status: "INVALID", reasons: ["Generated invariant failure."] }));
        graph = replaceStage(graph, uncertainStage, (item) => ({ ...item, status: "INDETERMINATE" }));
        expect(validateEDMatter(graph).status).toBe("INVALID");
      }
    ));
  });

  it("active hold always blocks completed disposition of the held target", () => {
    fc.assert(fc.property(
      fc.constantFrom("repr-produced", "item-1"),
      (heldId) => {
        let graph = baseline();
        graph = {
          ...graph,
          activeHoldResourceIds: [heldId],
          stages: graph.stages.map((item) => item.stage === "disposition"
            ? { ...item, status: "DISPOSED", inputResourceIds: [heldId] }
            : item)
        };
        expect(validateEDMatter(graph).status).toBe("INVALID");
      }
    ));
  });

  it("duplicate canonical IDs are always invalid", () => {
    fc.assert(fc.property(
      fc.constantFrom("dataSourceIds", "collectedItemIds", "representationIds", "activeHoldResourceIds"),
      (field) => {
        const graph = baseline();
        const value = field === "dataSourceIds" ? "source-1"
          : field === "collectedItemIds" ? "item-1"
          : field === "representationIds" ? "repr-processed"
          : "repr-produced";
        const altered = { ...graph, [field]: [value, value] } as EDMatterGraph;
        expect(validateEDMatter(altered).status).toBe("INVALID");
      }
    ));
  });

  it("duplicate ED-to-LE parent lineage is always invalid", () => {
    fc.assert(fc.property(fc.constantFrom("source-1", "item-1", "arbitrary-parent"), (parent) => {
      const graph = baseline();
      const altered = {
        ...graph,
        edToLeInputs: [{ ...graph.edToLeInputs[0]!, parentIds: [parent, parent] }]
      };
      expect(validateEDMatter(altered).status).toBe("INVALID");
    }));
  });

  it("collected workflow state never becomes supported LE evidence", () => {
    fc.assert(fc.property(
      fc.constantFrom("COLLECTED", "RESPONSIVE", "REVIEWED", "PRODUCED", "PRIVILEGED"),
      (workflowStatus) => {
        const graph = baseline();
        const altered = {
          ...graph,
          edToLeInputs: [{ ...graph.edToLeInputs[0]!, status: workflowStatus }]
        };
        const result = validateEDMatter(altered);
        expect(result.edToLe.qualifications.every((q) => q.evidence === "INDETERMINATE")).toBe(true);
      }
    ));
  });

  it("unresolved temporal values never create exact temporal entities", () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1 }).filter((value) => !Number.isFinite(Date.parse(value))),
      (unresolvedTime) => {
        const graph = baseline();
        const altered = {
          ...graph,
          edToLeInputs: [{ ...graph.edToLeInputs[0]!, occurredAt: unresolvedTime }]
        };
        const result = validateEDMatter(altered);
        expect(result.edToLe.temporalEntities).toHaveLength(0);
        expect(result.edToLe.uncertainties.length).toBeGreaterThan(0);
      }
    ));
  });

  it("missing representation address never maps cleanly", () => {
    fc.assert(fc.property(fc.boolean(), (dropSourceRef) => {
      const graph = baseline();
      const input = graph.edToLeInputs[0]!;
      const altered = {
        ...graph,
        edToLeInputs: [{
          ...input,
          representationRef: undefined,
          sourceRef: dropSourceRef ? undefined : input.sourceRef
        }]
      };
      const result = validateEDMatter(altered);
      expect(result.status).not.toBe("VALID");
    }));
  });

  it("reordering represented lifecycle stages does not change the result", () => {
    fc.assert(fc.property(fc.shuffledSubarray(requiredStages, { minLength: requiredStages.length, maxLength: requiredStages.length }), (order) => {
      const graph = baseline();
      const byName = new Map(graph.stages.map((item) => [item.stage, item]));
      const altered = { ...graph, stages: order.map((name) => byName.get(name)!) };
      expect(validateEDMatter(altered).status).toBe("VALID");
    }));
  });
});
