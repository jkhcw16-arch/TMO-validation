/**
 * TMO-ED matter-level integration validation.
 * Aggregates independently evaluated lifecycle modules and enforces cross-stage lineage.
 */

import { mapEDToLE, type EDToLEInput, type EDToLEResult } from "./ed-to-le.js";

export type EDMatterValidationStatus =
  | "VALID"
  | "VALID_WITH_LIMITATIONS"
  | "INDETERMINATE"
  | "INVALID";

export type EDIntegratedStage =
  | "preservation"
  | "collection"
  | "processing"
  | "review"
  | "privilege"
  | "redaction"
  | "analysis"
  | "requestResponse"
  | "production"
  | "disposition";

export interface EDStageResult {
  readonly stage: EDIntegratedStage;
  readonly status: string;
  readonly matterId: string;
  readonly resourceIds: readonly string[];
  readonly inputResourceIds: readonly string[];
  readonly outputResourceIds: readonly string[];
  readonly authorizationAction?: string;
  readonly authorizationStatus?: string;
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
}

export interface EDMatterGraph {
  readonly matterId: string;
  readonly dataSourceIds: readonly string[];
  readonly collectedItemIds: readonly string[];
  readonly representationIds: readonly string[];
  readonly activeHoldResourceIds: readonly string[];
  readonly stages: readonly EDStageResult[];
  readonly edToLeInputs: readonly EDToLEInput[];
}

export interface EDMatterValidationResult {
  readonly matterId: string;
  readonly status: EDMatterValidationStatus;
  readonly stageResults: Readonly<Record<EDIntegratedStage, string>>;
  readonly edToLe: EDToLEResult;
  readonly failedInvariants: readonly string[];
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
}

export const ED_MATTER_INVARIANTS = {
  "ED-MAT-101": "Every lifecycle result must belong to the same matter.",
  "ED-MAT-102": "Lifecycle outputs must remain traceable to addressable inputs and canonical resources.",
  "ED-MAT-103": "Operational authorization remains action-specific at every lifecycle stage.",
  "ED-MAT-104": "INVALID has precedence over INDETERMINATE, partial, and successful stage states.",
  "ED-MAT-105": "Unknown or unresolved stage state remains INDETERMINATE and cannot become pass.",
  "ED-MAT-106": "Collection, review, analysis, and production states cannot establish authenticity, truth, admissibility, or merits.",
  "ED-MAT-107": "Destructive or relinquishing disposition cannot proceed while a preservation hold remains active.",
  "ED-MAT-108": "ED-to-LE mapping occurs only after matter-level structural validation and cannot manufacture evidentiary support.",
  "ED-MAT-109": "Source, collected, processed, redacted, and produced representations remain separately addressable.",
  "ED-MAT-110": "Cross-stage limitations, exceptions, and failed invariants remain in the matter audit result."
} as const;

const REQUIRED_STAGES: readonly EDIntegratedStage[] = [
  "preservation",
  "collection",
  "processing",
  "review",
  "privilege",
  "redaction",
  "analysis",
  "requestResponse",
  "production",
  "disposition"
];

const EXPECTED_ACTION: Partial<Record<EDIntegratedStage, string>> = {
  preservation: "PRESERVE",
  collection: "COLLECT",
  processing: "PROCESS",
  review: "REVIEW",
  privilege: "REVIEW",
  redaction: "REDACT",
  analysis: "ANALYZE",
  production: "PRODUCE"
};

const invalidStatus = (status: string) => status === "INVALID" || status === "FAIL";
const indeterminateStatus = (status: string) => status === "INDETERMINATE";
const limitedStatus = (status: string) =>
  status.includes("PARTIAL") ||
  status.includes("LIMITATION") ||
  status === "CONTESTED" ||
  status === "INCONCLUSIVE";
const duplicate = (values: readonly string[]) => new Set(values).size !== values.length;

export function validateEDMatter(graph: EDMatterGraph): EDMatterValidationResult {
  const reasons: string[] = [];
  const limitations: string[] = [];
  const failed = new Set<string>();
  const stageResults = Object.fromEntries(
    REQUIRED_STAGES.map((stage) => [stage, "MISSING"])
  ) as Record<EDIntegratedStage, string>;

  if (!graph.matterId.trim()) {
    reasons.push("Matter ID is required.");
    failed.add("ED-MAT-101");
  }

  if (
    duplicate(graph.dataSourceIds) ||
    duplicate(graph.collectedItemIds) ||
    duplicate(graph.representationIds) ||
    duplicate(graph.activeHoldResourceIds)
  ) {
    reasons.push("Matter graph contains duplicate canonical resource references.");
    failed.add("ED-MAT-109");
  }

  const canonical = new Set([
    ...graph.dataSourceIds,
    ...graph.collectedItemIds,
    ...graph.representationIds,
    ...graph.stages.flatMap((stage) => stage.resourceIds)
  ]);

  for (const stageName of REQUIRED_STAGES) {
    const matching = graph.stages.filter((stage) => stage.stage === stageName);
    if (matching.length === 0) {
      limitations.push(`Lifecycle stage ${stageName} is not represented.`);
      failed.add("ED-MAT-105");
      continue;
    }
    if (matching.length > 1) {
      reasons.push(`Lifecycle stage ${stageName} appears more than once.`);
      failed.add("ED-MAT-101");
      continue;
    }

    const stage = matching[0]!;
    stageResults[stageName] = stage.status;

    if (stage.matterId !== graph.matterId) {
      reasons.push(`${stageName} belongs to a different matter.`);
      failed.add("ED-MAT-101");
    }
    if (duplicate(stage.resourceIds) || duplicate(stage.inputResourceIds) || duplicate(stage.outputResourceIds)) {
      reasons.push(`${stageName} contains duplicate lineage references.`);
      failed.add("ED-MAT-102");
    }
    for (const id of stage.inputResourceIds) {
      if (!canonical.has(id)) {
        reasons.push(`${stageName} references unknown input ${id}.`);
        failed.add("ED-MAT-102");
      }
    }
    for (const id of stage.outputResourceIds) {
      if (!canonical.has(id)) {
        reasons.push(`${stageName} references unknown output ${id}.`);
        failed.add("ED-MAT-102");
      }
    }

    const expectedAction = EXPECTED_ACTION[stageName];
    if (expectedAction && stage.authorizationAction !== expectedAction) {
      reasons.push(`${stageName} requires ${expectedAction} authorization.`);
      failed.add("ED-MAT-103");
    }
    if (expectedAction && !stage.authorizationStatus) {
      reasons.push(`${stageName} lacks an authorization decision.`);
      failed.add("ED-MAT-103");
    } else if (["NOT_AUTHORIZED", "EXPIRED", "REVOKED"].includes(stage.authorizationStatus ?? "")) {
      reasons.push(`${stageName} authorization is ${stage.authorizationStatus}.`);
      failed.add("ED-MAT-103");
    } else if (stage.authorizationStatus === "INDETERMINATE") {
      limitations.push(`${stageName} authorization is indeterminate.`);
      failed.add("ED-MAT-105");
    }

    if (invalidStatus(stage.status)) {
      reasons.push(...stage.reasons.map((reason) => `${stageName}: ${reason}`));
      failed.add("ED-MAT-104");
    }
    if (indeterminateStatus(stage.status)) {
      limitations.push(`${stageName} remains indeterminate.`);
      failed.add("ED-MAT-105");
    }
    if (limitedStatus(stage.status)) {
      limitations.push(`${stageName} completed with limitations: ${stage.status}.`);
    }
    limitations.push(...stage.limitations.map((item) => `${stageName}: ${item}`));
  }

  const disposition = graph.stages.find((stage) => stage.stage === "disposition");
  if (disposition && disposition.status !== "NOT_DISPOSED") {
    const heldTargets = disposition.inputResourceIds.filter((id) => graph.activeHoldResourceIds.includes(id));
    if (heldTargets.length > 0) {
      reasons.push(`Disposition targets remain under active hold: ${heldTargets.join(", ")}.`);
      failed.add("ED-MAT-107");
    }
  }

  const structuralInvalid = reasons.length > 0;
  const edToLe = structuralInvalid
    ? mapEDToLE([])
    : mapEDToLE(graph.edToLeInputs);

  if (!structuralInvalid && edToLe.status === "INVALID") {
    reasons.push(...edToLe.reasons.map((reason) => `ED-to-LE: ${reason}`));
    failed.add("ED-MAT-108");
  }
  if (!structuralInvalid && edToLe.status === "INDETERMINATE") {
    limitations.push("ED-to-LE mapping is indeterminate.");
    failed.add("ED-MAT-105");
  }
  if (!structuralInvalid && edToLe.status === "MAPPED_WITH_LIMITATIONS") {
    limitations.push(...edToLe.limitations.map((item) => `ED-to-LE: ${item}`));
  }

  let status: EDMatterValidationStatus;
  if (reasons.length > 0 || edToLe.status === "INVALID") {
    status = "INVALID";
  } else if (
    graph.stages.some((stage) => indeterminateStatus(stage.status)) ||
    graph.stages.some((stage) => stage.authorizationStatus === "INDETERMINATE") ||
    edToLe.status === "INDETERMINATE"
  ) {
    status = "INDETERMINATE";
  } else if (limitations.length > 0 || graph.stages.some((stage) => limitedStatus(stage.status)) || edToLe.status === "MAPPED_WITH_LIMITATIONS") {
    status = "VALID_WITH_LIMITATIONS";
  } else {
    status = "VALID";
  }

  return {
    matterId: graph.matterId,
    status,
    stageResults,
    edToLe,
    failedInvariants: [...failed],
    reasons,
    limitations
  };
}
